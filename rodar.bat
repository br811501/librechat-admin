@echo off
cd /d "%~dp0"

echo Building frontend...
cd frontend
call bun install
call bun run build
if errorlevel 1 (
    echo Frontend build failed.
    pause
    exit /b 1
)
cd ..

call venv\Scripts\activate.bat
start http://127.0.0.1:5000
python app.py
pause
