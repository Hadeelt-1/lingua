@echo off
echo ============================================
echo   Lingua 语伴 - starting backend server
echo ============================================

cd backend

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

echo.
echo Starting server... open http://127.0.0.1:5050 in your browser
echo (Keep this window open while you use Lingua)
echo.

python app.py

pause
