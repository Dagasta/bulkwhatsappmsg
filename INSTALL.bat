@echo off
echo ============================================
echo 🚀 BulkWaMsg Enterprise - Installation
echo ============================================
echo.

echo [1/3] Installing Root Dependencies...
call npm install
echo.

echo [2/3] Installing Engine Dependencies...
cd apps\engine
call npm install
cd ..\..
echo.

echo [3/3] Installing Frontend Dependencies...
cd apps\web
call npm install
cd ..\..
echo.

echo ============================================
echo ✅ Installation Complete!
echo ============================================
echo.
echo Next Steps:
echo 1. Set up your database: Copy the SQL from packages\database\schema.sql into your Supabase SQL Editor
echo 2. Update .env files with your Ngrok URL after first run
echo 3. Run: START-ENGINE.bat (start the engine first)
echo 4. Run: START-FRONTEND.bat (then start the frontend)
echo.
pause
