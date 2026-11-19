
@echo off
title VISOR GEOGRAFICO DE CIRCASIA
color 0A

cd /d "%~dp0"

echo ==========================================
echo       VISOR GEOGRAFICO DE CIRCASIA
echo ==========================================
echo.

if not exist "BACKEND\.env" (
    echo ERROR: No se encuentra BACKEND\.env
    echo Configure el archivo .env antes de continuar.
    pause
    exit /b 1
)

if not exist "BACKEND\venv\Scripts\python.exe" (
    echo ERROR: No se encuentra el entorno virtual.
    pause
    exit /b 1
)

echo Iniciando API...
start "API VISOR CIRCASIA" cmd /k "cd /d ""%~dp0BACKEND"" && ""venv\Scripts\python.exe"" -m uvicorn main:app --host 127.0.0.1 --port 8000"

echo.
echo Iniciando servidor del visor...
start "FRONTEND VISOR CIRCASIA" cmd /k "cd /d ""%~dp0FRONTEND"" && py -m http.server 5500"

echo.
echo Esperando el inicio de los servicios...
timeout /t 5 /nobreak >nul

start "" "http://127.0.0.1:5500"

echo.
echo ==========================================
echo       VISOR INICIADO
echo ==========================================
echo.
echo Visor: http://127.0.0.1:5500
echo API: http://127.0.0.1:8000
echo Documentacion: http://127.0.0.1:8000/docs
echo.
echo No cierre las ventanas de los servicios.
pause
