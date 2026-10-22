@echo off
title Asset Management System
color 0A

:: ============================================================
::  Asset Management System - Startup Launcher
::  Double-click this file to start the full-stack application.
::  Backend  : FastAPI/Uvicorn  -> http://localhost:4000
::  Frontend : Vite/React       -> http://localhost:4001
:: ============================================================

setlocal

:: Resolve the directory where this .bat file lives
set "BASE_DIR=%~dp0"
set "VENV_PYTHON=%BASE_DIR%backend\venv\Scripts\python.exe"
set "START_SCRIPT=%BASE_DIR%start.py"

echo.
echo ============================================================
echo        ASSET MANAGEMENT SYSTEM - LAUNCHER
echo ============================================================
echo.

:: Prefer the venv Python; fall back to system Python
if exist "%VENV_PYTHON%" (
    echo [OK] Found virtual environment Python.
    set "PYTHON_EXE=%VENV_PYTHON%"
) else (
    echo [..] Virtual environment not found - using system Python.
    echo      The startup script will report an error if a venv is required.
    where python >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [ERROR] Python is not installed or not on PATH.
        echo         Please install Python 3.10+ and try again.
        echo.
        pause
        exit /b 1
    )
    set "PYTHON_EXE=python"
)

:: Check that start.py exists
if not exist "%START_SCRIPT%" (
    echo.
    echo [ERROR] start.py not found at:
    echo         %START_SCRIPT%
    echo.
    pause
    exit /b 1
)

echo [>>] Launching application...
echo.

:: Run the Python startup orchestrator (handles DB, schema, both servers)
"%PYTHON_EXE%" "%START_SCRIPT%"

:: Keep the window open after servers stop so you can read any output/errors
echo.
echo ============================================================
echo  Application has stopped. Press any key to close.
echo ============================================================
pause >nul
endlocal
