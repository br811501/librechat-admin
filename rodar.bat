@echo off
cd /d "C:\Dev\librechat-dashboard"
call venv\Scripts\activate.bat
start http://127.0.0.1:5000
python app.py
pause