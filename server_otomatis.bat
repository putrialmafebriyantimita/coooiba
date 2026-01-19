@echo off
cd /d "C:\Users\putri\ujian_platform"
title SERVER UJIAN

echo ===============================
echo    SERVER UJIAN PLATFORM
echo ===============================
echo.
echo UNTUK PC: http://localhost:8000
echo UNTUK HP: http://putrialmafebriyanti:8000
echo.
echo ===============================
python manage.py runserver 0.0.0.0:8000
pause