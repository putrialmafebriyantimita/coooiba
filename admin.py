from django.contrib import admin
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import render, redirect
from django.http import HttpResponseRedirect
import csv
from .models import Ujian, Peserta, KodeAkses, HasilUjian

class MobileFriendlyAdmin(admin.ModelAdmin):
    class Media:
        css = {
            'all': ('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',)
        }

# ==================== FITUR IMPORT CSV ====================
class ImportExportMixin:
    """Mixin untuk fitur import/export data"""
    
    def import_csv_view(self, request):
        """Halaman untuk import data dari CSV"""
        if request.method == 'POST':
            csv_file = request.FILES.get('csv_file')
            if not csv_file:
                self.message_user(request, "❌ Harap pilih file CSV", level='ERROR')
                return redirect('..')
            
            try:
                decoded_file = csv_file.read().decode('utf-8').splitlines()
                reader = csv.DictReader(decoded_file)
                
                imported = 0
                errors = []
                
                for row_num, row in enumerate(reader, 2):  # row 2 karena header di row 1
                    try:
                        # Buat peserta baru
                        peserta, created = Peserta.objects.get_or_create(
                            nama=row['nama'].strip(),
                            defaults={
                                'kelas': row.get('kelas', '').strip(),
                                'nis': row.get('nis', '').strip()
                            }
                        )
                        if created:
                            imported += 1
                        else:
                            errors.append(f"Baris {row_num}: {row['nama']} sudah ada")
                            
                    except Exception as e:
                        errors.append(f"Baris {row_num}: Error - {str(e)}")
                
                # Tampilkan hasil
                if imported > 0:
                    self.message_user(request, f"✅ {imported} data berhasil diimport!")
                if errors:
                    self.message_user(request, f"⚠️ {len(errors)} error: {', '.join(errors[:5])}", level='WARNING')
                    
            except Exception as e:
                self.message_user(request, f"❌ Error membaca file: {str(e)}", level='ERROR')
            
            return redirect('..')
        
        # Template untuk upload
        return render(request, 'admin/import_csv.html', {
            'title': 'Import Data Peserta',
            'opts': self.model._meta,
        })

# ==================== PESERTA ADMIN - DITAMBAH FITUR IMPORT ====================
@admin.register(Peserta)
class PesertaAdmin(MobileFriendlyAdmin, ImportExportMixin):
    list_display = ('nis', 'nama', 'kelas', 'ujian_count', 'actions_column')
    list_filter = ('kelas',)
    search_fields = ('nis', 'nama', 'kelas')
    list_per_page = 50
    
    # Tambah URL custom untuk import
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import-csv/', self.admin_site.admin_view(self.import_csv_view), name='peserta_import_csv'),
        ]
        return custom_urls + urls
    
    def ujian_count(self, obj):
        count = obj.hasilujian_set.count()
        return format_html(
            '<span style="color: {};">{}</span>',
            'green' if count > 0 else 'gray',
            count
        )
    ujian_count.short_description = 'Ujian'
    
    def actions_column(self, obj):
        """Tombol aksi cepat"""
        return format_html(
            '<div style="white-space: nowrap;">'
            '<a href="/admin/ujian_core/peserta/{}/change/" class="button" title="Edit">✏️</a> '
            '<a href="/admin/ujian_core/peserta/{}/delete/" class="button" title="Hapus">🗑️</a>'
            '</div>',
            obj.id, obj.id
        )
    actions_column.short_description = 'Aksi'
    
    # Custom actions
    actions = ['export_selected', 'duplicate_selected']
    
    def export_selected(self, request, queryset):
        """Export data terpilih ke CSV"""
        response = "HttpResponse"(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="peserta_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['NIS', 'Nama', 'Kelas'])
        
        for peserta in queryset:
            writer.writerow([peserta.nis, peserta.nama, peserta.kelas])
        
        return response
    export_selected.short_description = "📤 Export data terpilih ke CSV"
    
    def duplicate_selected(self, request, queryset):
        """Duplicate data terpilih"""
        duplicated = 0
        for peserta in queryset:
            # Buat duplikat dengan nama yang berbeda
            new_nama = f"{peserta.nama} (Copy)"
            if not Peserta.objects.filter(nama=new_nama).exists():
                Peserta.objects.create(
                    nama=new_nama,
                    kelas=peserta.kelas,
                    nis=f"{peserta.nis}_copy" if peserta.nis else ""
                )
                duplicated += 1
        
        self.message_user(request, f"✅ {duplicated} data berhasil diduplikat!")
    duplicate_selected.short_description = "📝 Duplikat data terpilih"

# ==================== UJIAN ADMIN - DITAMBAH FITUR BATCH ====================
@admin.register(Ujian)
class UjianAdmin(MobileFriendlyAdmin):
    list_display = ('nama_ujian', 'pin_ujian', 'waktu_mulai', 'durasi', 'aktif', 'peserta_count', 'ujian_actions')
    list_filter = ('aktif', 'waktu_mulai')
    search_fields = ('nama_ujian', 'pin_ujian')
    list_editable = ('aktif',)  # Bisa edit langsung dari list
    
    def peserta_count(self, obj):
        count = obj.hasilujian_set.count()
        return format_html('<b>{}</b>', count)
    peserta_count.short_description = 'Peserta'
    
    def ujian_actions(self, obj):
        """Tombol aksi untuk ujian"""
        return format_html(
            '<div style="white-space: nowrap;">'
            '<a href="/admin/ujian_core/kodeakses/?ujian__id__exact={}" class="button" title="Lihat Kode">🔑</a> '
            '<a href="/admin/ujian_core/hasilujian/?ujian__id__exact={}" class="button" title="Lihat Hasil">📊</a>'
            '</div>',
            obj.id, obj.id
        )
    ujian_actions.short_description = 'Aksi'

# ==================== KODE AKSES ADMIN - TETAP SAMA ====================
@admin.register(KodeAkses)
class KodeAksesAdmin(MobileFriendlyAdmin):
    list_display = ('kode', 'ujian', 'terpakai', 'created_time')
    list_filter = ('terpakai', 'ujian')
    search_fields = ('kode',)

    def created_time(self, obj):
        return obj.ujian.waktu_mulai
    created_time.short_description = 'Waktu Ujian'

# ==================== HASIL UJIAN ADMIN - TETAP SAMA ====================
@admin.register(HasilUjian)
class HasilUjianAdmin(MobileFriendlyAdmin):
    list_display = ('peserta', 'ujian', 'status_badge', 'percobaan_keluar', 'duration', 'waktu_mulai')
    list_filter = ('status', 'ujian', 'waktu_mulai')
    search_fields = ('peserta__nama', 'ujian__nama_ujian')
    readonly_fields = ('waktu_mulai', 'percobaan_keluar', 'jawaban_preview')

    def status_badge(self, obj):
        colors = {
            'mulai': 'blue',
            'selesai': 'green', 
            'diskualifikasi': 'red'
        }
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">{}</span>',
            colors.get(obj.status, 'gray'), obj.status.upper()
        )
    status_badge.short_description = 'Status'

    def duration(self, obj):
        if obj.waktu_selesai:
            duration = obj.waktu_selesai - obj.waktu_mulai
            minutes = duration.total_seconds() / 60
            return f"{int(minutes)} menit"
        return "Masih berlangsung"
    duration.short_description = 'Durasi'

    def jawaban_preview(self, obj):
        if obj.jawaban:
            return format_html("<pre>{}</pre>", str(obj.jawaban)[:200] + "..." if len(str(obj.jawaban)) > 200 else str(obj.jawaban))
        return "-"
    jawaban_preview.short_description = 'Preview Jawaban'

    # Actions
    actions = ['reset_ujian', 'diskualifikasi_ujian']

    def reset_ujian(self, request, queryset):
        updated = queryset.update(
            status='mulai',
            percobaan_keluar=0,
            jawaban={},
            waktu_selesai=None
        )
        self.message_user(request, f"{updated} ujian berhasil direset")
    reset_ujian.short_description = "🔄 Reset ujian terpilih"

    def diskualifikasi_ujian(self, request, queryset):
        updated = queryset.update(status='diskualifikasi')
        self.message_user(request, f"{updated} peserta didiskualifikasi")
    diskualifikasi_ujian.short_description = "🚫 Diskualifikasi peserta terpilih"

# ==================== TAMBAH LINK IMPORT DI HALAMAN UTAMA ADMIN ====================
admin.site.site_header = "Sistem Ujian Digital"
admin.site.site_title = "Admin Ujian"
admin.site.index_title = "Dashboard Management Ujian"