from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Peserta, Ujian, KodeAkses, HasilUjian
from .serializers import LoginSerializer, KodeAksesSerializer, JawabanSerializer, PelanggaranSerializer
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import json
from .utils import send_alert 
import os
from django.conf import settings
import uuid
from django.utils import timezone

# ==================== HALAMAN FRONTEND ====================
def login_view(request):
    """Halaman login peserta"""
    return render(request, 'ujian_core/login.html')

def menu_view(request):
    """Halaman menu setelah login"""
    return render(request, 'ujian_core/menu.html')

def exam_view(request):
    """Halaman exam (masuk kode akses)"""
    return render(request, 'ujian_core/exam.html')

def manage_peserta_view(request):
    """Halaman manage peserta"""
    return render(request, 'ujian_core/manage_peserta.html')

def exam_consent_view(request):
    """Halaman persetujuan ujian"""
    return render(request, 'ujian_core/exam_consent.html')

def exam_lock_view(request):
    """Halaman terkunci saat ujian"""
    return render(request, 'ujian_core/exam_lock.html')

# ==================== TEST NOTIF ====================
@api_view(['GET'])
def test_notif(request):
    """Test endpoint untuk notifikasi"""
    try:
        send_alert("Test notifikasi dari Django")
        return Response({
            "status": "success",
            "message": "Notifikasi test dikirim"
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": f"Gagal: {str(e)}"
        })

# ==================== API AUTH & UJIAN ====================
@api_view(['POST'])
def login_peserta(request):
    """
    LOGIN:
    1. cek DB
    2. kalau tidak ada → cek siswa.json
    3. kalau ada di JSON → auto insert DB → login
    """
    serializer = LoginSerializer(data=request.data)

    if serializer.is_valid():
        nama = serializer.validated_data['nama'].strip()
        pin_ujian = serializer.validated_data['pin_ujian']

        # ====== CEK UJIAN DULU ======
        try:
            ujian = Ujian.objects.get(pin_ujian=pin_ujian, aktif=True)
        except Ujian.DoesNotExist:
            return Response({
                "status": "error",
                "message": "PIN ujian salah atau ujian tidak aktif"
            }, status=400)

        # ====== CEK DATABASE ======
        peserta = Peserta.objects.filter(nama__iexact=nama).first()

        # ====== KALAU TIDAK ADA → CEK JSON ======
        if not peserta:
            # ---------- FIX PATH JSON ----------
            json_path = os.path.join(settings.BASE_DIR, "ujian_core", "siswa.json")

            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    siswa_data = json.load(f)

                for item in siswa_data:
                    nama_json = item.get("Nama", "").strip().lower()

                    if nama_json == nama.lower():
                        peserta = Peserta.objects.create(
                            nama=item.get("Nama", "").strip(),
                            nis=str(item.get("Nis ", "")).strip(),
                            kelas=item.get("Jurusan", "").strip()
                        )
                        break

        # ====== VALIDASI TERAKHIR ======
        if not peserta:
            return Response({
                "status": "error",
                "message": "Nama peserta tidak ditemukan"
            }, status=400)

        # ====== LOGIN SUKSES ======
        return Response({
            "status": "success",
            "peserta_id": peserta.id,
            "nama": peserta.nama,
            "kelas": getattr(peserta, "kelas", None),
            "ujian_id": ujian.id,
            "nama_ujian": ujian.nama_ujian
        })

    return Response(serializer.errors, status=400)


@api_view(['POST'])
def validate_kode_akses(request):
    serializer = KodeAksesSerializer(data=request.data)
    if serializer.is_valid():
        kode_akses = serializer.validated_data['kode_akses']
        peserta_id = serializer.validated_data['peserta_id']
        
        try:
            kode = KodeAkses.objects.get(kode=kode_akses, terpakai=False)
            peserta = Peserta.objects.get(id=peserta_id)
            
            hasil_ujian, created = HasilUjian.objects.get_or_create(
                peserta=peserta,
                ujian=kode.ujian,
                defaults={'status': 'mulai'}
            )
            
            kode.terpakai = True
            kode.save()
            
            # ✅ RESPONSE DENGAN SESSION TOKEN
            response_data = {
                "status": "success",
                "url_soal": kode.ujian.url_soal,
                "ujian_id": kode.ujian.id,
                "hasil_ujian_id": hasil_ujian.id,
                "session_token": None,  # Default null
                "requires_consent": False  # Default false
            }
            
            # ✅ CEK APAKAH LOCK SYSTEM AKTIF
            try:
                from .models import SessionLock
                
                # Buat session lock
                session_lock, created = SessionLock.objects.get_or_create(
                    hasil_ujian=hasil_ujian,
                    defaults={
                        'session_token': str(uuid.uuid4()),
                        'ip_address': request.META.get('REMOTE_ADDR'),
                        'user_agent': request.META.get('HTTP_USER_AGENT', '')
                    }
                )
                
                response_data['session_token'] = session_lock.session_token
                response_data['requires_consent'] = True
                
            except ImportError:
                # Model SessionLock belum ada, skip
                pass
            
            return Response(response_data)
            
        except (KodeAkses.DoesNotExist, Peserta.DoesNotExist):
            return Response({
                "status": "error",
                "message": "Kode akses tidak valid atau peserta tidak ditemukan"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def submit_jawaban(request):
    serializer = JawabanSerializer(data=request.data)
    if serializer.is_valid():
        try:
            hasil_ujian = HasilUjian.objects.get(id=serializer.validated_data['hasil_ujian_id'])
            hasil_ujian.jawaban = serializer.validated_data['jawaban_data']
            hasil_ujian.status = 'selesai'
            hasil_ujian.save()
            
            return Response({
                "status": "success",
                "message": "Jawaban berhasil disimpan"
            })
            
        except HasilUjian.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Data ujian tidak ditemukan"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def report_pelanggaran(request):
    serializer = PelanggaranSerializer(data=request.data)
    if serializer.is_valid():
        try:
            hasil_ujian = HasilUjian.objects.get(id=serializer.validated_data['hasil_ujian_id'])
            
            hasil_ujian.catatan_pelanggaran = f"{serializer.validated_data['jenis_pelanggaran']}: {serializer.validated_data['detail']}"
            hasil_ujian.save()
            
            return Response({
                "status": "success", 
                "message": "Pelanggaran berhasil dilaporkan"
            })
            
        except HasilUjian.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Data ujian tidak ditemukan"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== API MANAGE PESERTA ====================
@api_view(['POST'])
@csrf_exempt
def tambah_peserta_simple(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            nama = data.get('nama', '').strip()
            
            if not nama:
                return Response({
                    "status": "error",
                    "message": "❌ Nama tidak boleh kosong"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if Peserta.objects.filter(nama__iexact=nama).exists():
                return Response({
                    "status": "error", 
                    "message": f"❌ Peserta dengan nama '{nama}' sudah ada"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            peserta = Peserta.objects.create(nama=nama)
            
            return Response({
                "status": "success",
                "message": f"✅ Peserta '{nama}' berhasil ditambahkan!",
                "data": {
                    "id": peserta.id,
                    "nama": peserta.nama,
                    "created_at": peserta.created_at.strftime("%Y-%m-%d %H:%M:%S")
                }
            })
            
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"❌ Terjadi error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_peserta(request):
    try:
        peserta_list = Peserta.objects.all().order_by('id')
        
        data = []
        for peserta in peserta_list:
            total_ujian = peserta.hasilujian_set.count()

            peserta_data = {
                "id": peserta.id,
                "nama": peserta.nama,
                "total_ujian": total_ujian
            }
            
            if hasattr(peserta, 'nis') and peserta.nis:
                peserta_data["nis"] = peserta.nis
            if hasattr(peserta, 'kelas') and peserta.kelas:
                peserta_data["kelas"] = peserta.kelas
                
            data.append(peserta_data)
        
        return Response({
            "status": "success",
            "total": len(data),
            "data": data
        })
        
    except Exception as e:
        return Response({
            "status": "error",
            "message": f"❌ Error: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== TELEGRAM ALERT ====================
@api_view(['POST'])
@csrf_exempt
def telegram_alert(request):
    try:
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        
        print("📨 Received alert data:", data)
        
        is_completion = data.get("isCompletion", False)
        alert_type = data.get("type", "")
        custom_message = data.get("message", "")
        
        if custom_message:
            message = custom_message

        elif is_completion or alert_type == "EXAM_FINISHED":
            student = data.get("student", "Unknown Student")
            kelas = data.get("class", "Unknown Class")
            exam = data.get("exam", "Unknown Exam")
            platform = data.get("platform", "Unknown")
            timestamp = data.get("timestamp", "")
            time_left = data.get("timeLeft", 0)
            
            minutes_left = time_left // 60
            seconds_left = time_left % 60
            time_left_str = f"{minutes_left:02d}:{seconds_left:02d}" if time_left > 0 else "00:00"
            
            message = f"""
🎉 <b>SISWA MENYELESAIKAN UJIAN</b> 🎉

👤 <b>Siswa:</b> {student}
🏫 <b>Kelas:</b> {kelas}
📚 <b>Ujian:</b> {exam}
💻 <b>Platform:</b> {platform}
⏱️ <b>Sisa Waktu:</b> {time_left_str}
⏰ <b>Waktu Submit:</b> {timestamp}

✅ <b>STATUS: TELAH MENYELESAIKAN UJIAN</b>
            """
        else:
            student = data.get("student", "Unknown Student")
            kelas = data.get("class", "Unknown Class")
            exam = data.get("exam", "Unknown Exam")
            violation = data.get("violationType", "Unknown Violation")
            details = data.get("details", "No details")
            warning = data.get("warningCount", 0)
            platform = data.get("platform", "Unknown")
            timestamp = data.get("timestamp", "")
            
            message = f"""
🚨 <b>PELANGGARAN UJIAN TERDETEKSI</b> 🚨

👤 <b>Siswa:</b> {student}
🏫 <b>Kelas:</b> {kelas}
📚 <b>Ujian:</b> {exam}
⚠️ <b>Jenis Pelanggaran:</b> {violation}
📋 <b>Detail:</b> {details}
🔢 <b>Peringatan:</b> {warning}/3
💻 <b>Platform:</b> {platform}
⏰ <b>Waktu:</b> {timestamp}
            """
        
        log_file = os.path.join(settings.BASE_DIR, 'alerts.log')
        with open(log_file, 'a', encoding='utf-8') as f:
            log_entry = {
                'timestamp': data.get('timestamp', ''),
                'type': 'COMPLETION' if is_completion else 'VIOLATION',
                'student': data.get('student', ''),
                'class': data.get('class', ''),
                'exam': data.get('exam', ''),
                'violation': data.get('violationType', ''),
                'details': data.get('details', '')
            }
            f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        
        send_alert(message)
        
        print(f"✅ { 'COMPLETION' if is_completion else 'VIOLATION' } Alert sent to Telegram successfully")
        
        return Response({
            "status": "success", 
            "message": "Alert dikirim ke Telegram",
            "alert_type": "completion" if is_completion else "violation",
            "data_received": {
                "student": data.get('student', ''),
                "type": alert_type,
                "is_completion": is_completion
            }
        })
        
    except Exception as e:
        print("❌ Error in telegram_alert:", str(e))
        return Response({
            "status": "error", 
            "message": f"Internal server error: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== FALLBACK VIOLATION ENDPOINT ====================
@api_view(['POST'])
@csrf_exempt
def violation_alert(request):
    try:
        data = json.loads(request.body)
        
        log_file = os.path.join(settings.BASE_DIR, 'violations_fallback.log')
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(data, ensure_ascii=False) + '\n')
        
        return Response({
            "status": "success",
            "message": "Violation logged (fallback)"
        })
        
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=500)

# ==========================================================
#            IMPORT DATA SISWA JSON → DATABASE
# ==========================================================
@api_view(['POST'])
@csrf_exempt
def import_siswa_json(request):
    """
    IMPORT DATA PESERTA DARI FILE siswa.json 
    """
    try:
        json_path = os.path.join(settings.BASE_DIR, "ujian_core", "siswa.json")

        if not os.path.exists(json_path):
            return Response({
                "status": "error",
                "message": "File siswa.json tidak ditemukan."
            }, status=400)

        # baca file json
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            return Response({
                "status": "error",
                "message": "Format JSON tidak valid (harus list)."
            }, status=400)

        imported = 0
        skipped = 0
        errors = []

        for item in data:
            try:
                nama = item.get("Nama", "").strip()
                nis = str(item.get("Nis ", "")).strip()
                kelas = item.get("Jurusan", "").strip()

                if not nama:
                    skipped += 1
                    continue

                if Peserta.objects.filter(nama__iexact=nama).exists():
                    skipped += 1
                    continue

                Peserta.objects.create(
                    nama=nama,
                    nis=nis,
                    kelas=kelas
                )

                imported += 1

            except Exception as e:
                errors.append({"nama": item.get("Nama", ""), "error": str(e)})
                skipped += 1

        return Response({
            "status": "success",
            "imported": imported,
            "skipped": skipped,
            "errors": errors
        })

    except Exception as e:
        return Response({
            "status": "error",
            "message": f"Internal error: {str(e)}"
        }, status=500)
    # ✅ TAMBAH FUNGSI INI DI views.py

# ==================== ADMIN VIEWS ====================
def admin_monitor_view(request):
    """Dashboard monitoring admin"""
    # ✅ CEK APAKAH USER ADALAH STAFF/ADMIN
    if not request.user.is_authenticated or not request.user.is_staff:
        return redirect('/admin/login/?next=/admin/monitor/')
    
    return render(request, 'ujian_core/admin_monitor.html')