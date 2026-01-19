from django.db import models
from django.contrib.auth.models import User
import uuid
from django.core.signing import Signer
from django.utils.crypto import get_random_string
from django.utils import timezone

# Model yang sudah ada (TIDAK DIUBAH)
class Ujian(models.Model):
    nama_ujian = models.CharField(max_length=100)
    pin_ujian = models.CharField(max_length=10)
    url_soal = models.URLField()
    waktu_mulai = models.DateTimeField()
    durasi = models.IntegerField()
    aktif = models.BooleanField(default=True)

    def __str__(self):
        return self.nama_ujian

class Peserta(models.Model):
    nis = models.CharField(max_length=20)
    nama = models.CharField(max_length=100)
    kelas = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.nis} - {self.nama}"

class KodeAkses(models.Model):
    kode = models.CharField(max_length=50, unique=True)
    ujian = models.ForeignKey(Ujian, on_delete=models.CASCADE)
    terpakai = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.kode} - {self.ujian.nama_ujian}"

class HasilUjian(models.Model):
    peserta = models.ForeignKey(Peserta, on_delete=models.CASCADE)
    ujian = models.ForeignKey(Ujian, on_delete=models.CASCADE)
    jawaban = models.JSONField(default=dict)
    percobaan_keluar = models.IntegerField(default=0)
    waktu_mulai = models.DateTimeField(auto_now_add=True)
    waktu_selesai = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('mulai', 'Mulai'),
            ('selesai', 'Selesai'),
            ('diskualifikasi', 'Diskualifikasi')
        ],
        default='mulai'
    )

    def __str__(self):
        return f"{self.peserta.nama} - {self.ujian.nama_ujian}"

# ===== MODEL BARU UNTUK SISTEM PENGUNCIAN =====

class SessionLock(models.Model):
    """Model untuk mengunci sesi ujian peserta"""
    hasil_ujian = models.OneToOneField(HasilUjian, on_delete=models.CASCADE, related_name='session_lock')
    
    # Lock status
    is_locked = models.BooleanField(default=False)
    lock_start_time = models.DateTimeField(null=True, blank=True)
    lock_end_time = models.DateTimeField(null=True, blank=True)
    
    # Consent
    user_consented = models.BooleanField(default=False)
    consent_time = models.DateTimeField(null=True, blank=True)
    
    # Security tokens
    session_token = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    unlock_token = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    # Browser fingerprinting
    browser_fingerprint = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    screen_resolution = models.CharField(max_length=20, blank=True)
    
    # Attempt tracking
    unlock_attempts = models.IntegerField(default=0)
    last_unlock_attempt = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Session Lock"
        verbose_name_plural = "Session Locks"
    
    def __str__(self):
        return f"Lock for {self.hasil_ujian.peserta.nama} - {self.hasil_ujian.ujian.nama_ujian}"
    
    def generate_tokens(self):
        """Generate security tokens"""
        self.session_token = str(uuid.uuid4())
        self.unlock_token = get_random_string(50)
        self.save()
    
    def is_valid_session(self):
        """Check if session is valid and locked"""
        return (
            self.is_locked and 
            self.user_consented and
            self.hasil_ujian.status == 'mulai'
        )

class RemoteAccess(models.Model):
    """Model untuk remote access admin ke sesi ujian"""
    ACCESS_TYPES = [
        ('MONITOR', 'Monitoring Only'),
        ('ASSIST', 'Assistance Mode'),
        ('CONTROL', 'Full Control'),
    ]
    
    session_lock = models.ForeignKey(SessionLock, on_delete=models.CASCADE, related_name='remote_accesses')
    
    # Access info
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPES, default='MONITOR')
    granted_by_admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='granted_accesses')
    
    # Tokens
    admin_access_token = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    view_only_token = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    
    # Consent tracking
    admin_consented = models.BooleanField(default=False)
    user_consented = models.BooleanField(default=False)
    user_consent_time = models.DateTimeField(null=True, blank=True)
    
    # Security
    admin_ip = models.GenericIPAddressField(null=True, blank=True)
    encryption_key = models.CharField(max_length=64, default=lambda: get_random_string(64))
    
    # Audit trail
    activity_log = models.JSONField(default=list)
    
    class Meta:
        verbose_name = "Remote Access"
        verbose_name_plural = "Remote Accesses"
    
    def __str__(self):
        return f"Remote Access to {self.session_lock.hasil_ujian.peserta.nama}"
    
    def log_activity(self, action, details):
        """Log activity to audit trail"""
        log_entry = {
            'timestamp': timezone.now().isoformat(),
            'action': action,
            'details': details,
            'admin': self.granted_by_admin.username if self.granted_by_admin else 'System'
        }
        
        # Encrypt sensitive data
        signer = Signer()
        encrypted_entry = signer.sign_object(log_entry)
        
        self.activity_log.append(encrypted_entry)
        self.save(update_fields=['activity_log'])
    
    def has_control_permission(self):
        """Check if this access has control permission"""
        return self.access_type == 'CONTROL' and self.is_active

class SecurityEvent(models.Model):
    """Model untuk logging security events"""
    EVENT_TYPES = [
        ('LOCK', 'Session Locked'),
        ('UNLOCK_ATTEMPT', 'Unlock Attempt'),
        ('UNLOCK_SUCCESS', 'Unlock Success'),
        ('UNLOCK_FAILED', 'Unlock Failed'),
        ('REMOTE_ACCESS_REQUEST', 'Remote Access Request'),
        ('REMOTE_ACCESS_GRANTED', 'Remote Access Granted'),
        ('REMOTE_ACCESS_REVOKED', 'Remote Access Revoked'),
        ('PAGE_VIOLATION', 'Page Violation'),
        ('SESSION_TAMPER', 'Session Tampering'),
    ]
    
    session_lock = models.ForeignKey(SessionLock, on_delete=models.CASCADE, related_name='security_events', null=True, blank=True)
    remote_access = models.ForeignKey(RemoteAccess, on_delete=models.SET_NULL, null=True, blank=True)
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    description = models.TextField()
    
    # Device info
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    browser_fingerprint = models.TextField(blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Additional data
    metadata = models.JSONField(default=dict)
    
    class Meta:
        verbose_name = "Security Event"
        verbose_name_plural = "Security Events"
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.event_type} - {self.timestamp}"

# ===== SIGNALS UNTUK AUTO-CREATE =====

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=HasilUjian)
def create_session_lock(sender, instance, created, **kwargs):
    """Automatically create session lock when HasilUjian is created"""
    if created and instance.status == 'mulai':
        SessionLock.objects.create(
            hasil_ujian=instance,
            session_token=str(uuid.uuid4())
        )

# ===== UTILITY FUNCTIONS =====

def create_remote_access_request(session_lock, admin_user, access_type='MONITOR', purpose=''):
    """Create a remote access request"""
    remote_access = RemoteAccess.objects.create(
        session_lock=session_lock,
        granted_by_admin=admin_user,
        access_type=access_type,
        admin_access_token=str(uuid.uuid4()),
        view_only_token=get_random_string(50),
        encryption_key=get_random_string(64)
    )
    
    # Log the request
    SecurityEvent.objects.create(
        session_lock=session_lock,
        remote_access=remote_access,
        event_type='REMOTE_ACCESS_REQUEST',
        description=f'Remote access requested by {admin_user.username}',
        ip_address=admin_user.last_login_ip if hasattr(admin_user, 'last_login_ip') else '0.0.0.0',
        user_agent='Admin Panel',
        metadata={
            'access_type': access_type,
            'purpose': purpose,
            'admin_id': admin_user.id
        }
    )
    
    return remote_access

def get_active_session_locks(ujian_id=None):
    """Get all active session locks, optionally filtered by ujian"""
    query = SessionLock.objects.filter(
        is_locked=True,
        user_consented=True,
        hasil_ujian__status='mulai'
    )
    
    if ujian_id:
        query = query.filter(hasil_ujian__ujian_id=ujian_id)
    
    return query.select_related(
        'hasil_ujian__peserta',
        'hasil_ujian__ujian'
    )