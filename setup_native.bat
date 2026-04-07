@echo off
setlocal

echo.
echo ==========================================
echo   InvenSight Native Setup (No Docker)
echo ==========================================
echo.

:: --- 1. Database ---
echo [1] Setting up Database...
echo Make sure PostgreSQL is running.
set /p DB_PASS="Enter your PostgreSQL password: "
SET PGPASSWORD=%DB_PASS%

:: Check if pg_isready exists
where pg_isready >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: psql or pg_isready not in PATH. Install Postgres or add bin to PATH.
    pause
    exit /b 1
)

:: Re-create DB
echo Deleting old database (if exists)...
dropdb -U postgres InvenSight 2>nul
createdb -U postgres InvenSight
if %ERRORLEVEL% neq 0 (
    echo Error during database creation. Ensure Postgres is running and password is correct.
    pause
    exit /b 1
)

echo Restoring backup.sql...
psql -U postgres -d InvenSight -f backup.sql
if %ERRORLEVEL% neq 0 (
    echo Error during database restoration.
    pause
    exit /b 1
)

:: --- 2. Backend ---
echo.
echo [2] Setting up Backend...
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
)

cd server
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate
echo Installing Python dependencies (including Prophet)...
pip install -r requirements.txt
cd ..

:: --- 3. Frontend ---
echo.
echo [3] Setting up Frontend...
echo Installing npm dependencies...
npm install

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo To run the app:
echo Backend: cd server ^&^& venv\Scripts\activate ^&^& python main.py
echo Frontend: npm run dev
echo.
pause
