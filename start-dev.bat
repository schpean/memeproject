@echo off
echo ===============================================
echo    Meme Website Development Environment
echo ===============================================
echo.
echo This script will:
echo 1. Start the server on port 1337
echo 2. Start the client on port 1338
echo.
echo Alternative options:
echo - npm start: Just start the React app on port 1338
echo - npm run server: Just start the server on port 1337
echo - npm run dev: Start both using concurrently (single terminal)
echo.

set PORT=1338
cd %~dp0
start cmd /k "npm run server"
echo Server started on port 1337...
timeout /t 3 /nobreak > nul
start cmd /k "npm run start-windows"
echo React app started on port 1338...
echo.
echo ===============================================
echo    Development environment is now running!
echo ===============================================
echo - Server: http://localhost:1337
echo - Client: http://localhost:1338
echo.
echo Press any key to close this window (servers will continue running).
pause > nul 