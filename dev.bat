@echo off
echo 🚀 Starting AI Learning Platform Development...

REM Refresh PATH
set PATH=%PATH%;C:\Program Files\nodejs

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ package.json not found. Make sure you're in the project directory.
    pause
    exit /b 1
)

REM Start development server
echo Starting development server...
npm run dev

pause
