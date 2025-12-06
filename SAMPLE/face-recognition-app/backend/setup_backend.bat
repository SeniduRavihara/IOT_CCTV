@echo off
title Face Recognition Backend Setup
echo ====================================
echo   Face Recognition Backend Setup
echo ====================================
echo.

REM Remove old virtual environment
if exist "face_recognition_venv" (
    echo Removing old virtual environment...
    rmdir /s /q face_recognition_venv
)

REM Create new virtual environment
echo Creating new virtual environment...
python -m venv face_recognition_venv

REM Activate virtual environment
echo Activating virtual environment...
call face_recognition_venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install compatible versions one by one
echo Installing NumPy (compatible version)...
pip install numpy>=1.25.2

echo Installing TensorFlow (Windows compatible)...
pip install tensorflow>=2.15.0

echo Installing other dependencies...
pip install flask==2.3.3
pip install flask-cors==4.0.0
pip install opencv-python==4.8.1.78
pip install deepface==0.0.79
pip install pymilvus==2.3.4
pip install pillow==10.0.1
pip install scikit-learn==1.3.2
pip install python-dateutil==2.8.2

echo.
echo ====================================
echo   Setup Complete!
echo ====================================
echo.
echo To start the backend:
echo 1. Run: face_recognition_venv\Scripts\activate.bat
echo 2. Run: python app.py
echo.
pause

