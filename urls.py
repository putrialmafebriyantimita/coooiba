from django.urls import path
from . import views

urlpatterns = [
    # TEST
    path('test-notif/', views.test_notif, name='test_notif'),

    # FRONTEND
    path('', views.login_view, name='login_view'),
    path('menu/', views.menu_view, name='menu_view'),
    path('exam/', views.exam_view, name='exam_view'),
    path('manage-peserta/', views.manage_peserta_view, name='manage_peserta'),
    
    # ✅ HALAMAN LOCK SYSTEM (BARU)
    path('exam/consent/', views.exam_consent_view, name='exam_consent'),
    path('exam/lock/', views.exam_lock_view, name='exam_lock'),
    path('admin/monitor/', views.admin_monitor_view, name='admin_monitor'),
    
    # API UJIAN
    path('api/login/', views.login_peserta, name='login'),
    path('api/validate-kode/', views.validate_kode_akses, name='validate_kode'),
    path('api/submit-jawaban/', views.submit_jawaban, name='submit_jawaban'),
    path('api/report-pelanggaran/', views.report_pelanggaran, name='report_pelanggaran'),
    
    # ✅ TELEGRAM ALERT ENDPOINTS
    path('api/telegram-alert/', views.telegram_alert, name='telegram_alert'),
    path('api/violation-alert/', views.violation_alert, name='violation_alert'),
    
    # API MANAGE PESERTA
    path('api/tambah-peserta/', views.tambah_peserta_simple, name='tambah_peserta'),
    path('api/list-peserta/', views.list_peserta, name='list_peserta'), 
]