from rest_framework import serializers
from .models import Peserta, Ujian, KodeAkses, HasilUjian

class LoginSerializer(serializers.Serializer):
    nama = serializers.CharField()
    pin_ujian = serializers.CharField()

class KodeAksesSerializer(serializers.Serializer):
    kode_akses = serializers.CharField()
    peserta_id = serializers.IntegerField()

class JawabanSerializer(serializers.Serializer):
    peserta_id = serializers.IntegerField()
    ujian_id = serializers.IntegerField()
    jawaban = serializers.JSONField()

class PelanggaranSerializer(serializers.Serializer):
    peserta_id = serializers.IntegerField()
    ujian_id = serializers.IntegerField()
    jenis_pelanggaran = serializers.CharField()