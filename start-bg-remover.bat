@echo off
chcp 65001 >nul
title Background Remover - Batch Processing

echo.
echo ======================================
echo   Background Remover - CLI Tool
echo ======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    echo This is a one-time setup. Please wait...
    echo.
    call npm install
    echo.
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed!
    echo.
)

REM Check if input folder exists
if not exist "input\" (
    echo [INFO] Creating input folder...
    mkdir input
)

REM Check if there are files in input folder
dir /b "input\*.*" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] No files found in input folder
    echo.
    echo Please add images (WebP, PNG, JPG) to the "input" folder
    echo and run this batch file again.
    echo.
    pause
    exit /b 0
)

echo [START] Processing images in input folder...
echo.

REM Run the CLI tool
node bg-remover-cli.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================
    echo   Processing Complete!
    echo ======================================
    echo.
    echo Output files saved to: output\
    echo.

    REM Ask if user wants to create ZIP
    set /p createzip="Create ZIP file? (y/n): "
    if /i "%createzip%"=="y" (
        echo.
        echo Creating ZIP file...
        node bg-remover-cli.js --zip
    )

    REM Ask if user wants to open output folder
    set /p openfolder="Open output folder? (y/n): "
    if /i "%openfolder%"=="y" (
        start "" "output"
    )
) else (
    echo.
    echo ======================================
    echo   Processing Failed
    echo ======================================
    echo.
    echo Please check the error messages above.
)

echo.
pause
