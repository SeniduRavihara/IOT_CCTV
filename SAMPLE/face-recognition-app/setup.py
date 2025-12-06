#!/usr/bin/env python3
"""
Setup script for Face Recognition Application
Automates the installation and setup process
"""

import subprocess
import sys
import os
import platform

def run_command(command, check=True, shell=True):
    """Run a command and return the result"""
    print(f"Running: {command}")
    try:
        result = subprocess.run(command, check=check, shell=shell, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        if e.stderr:
            print(f"Error output: {e.stderr}")
        return False

def check_prerequisites():
    """Check if all prerequisites are installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Python
    try:
        python_version = subprocess.run([sys.executable, "--version"], capture_output=True, text=True)
        print(f"✅ Python: {python_version.stdout.strip()}")
    except FileNotFoundError:
        print("❌ Python not found. Please install Python 3.8+")
        return False
    
    # Check Node.js
    try:
        node_version = subprocess.run(["node", "--version"], capture_output=True, text=True)
        print(f"✅ Node.js: {node_version.stdout.strip()}")
    except FileNotFoundError:
        print("❌ Node.js not found. Please install Node.js 18+")
        return False
    
    # Check npm
    try:
        npm_version = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        print(f"✅ npm: {npm_version.stdout.strip()}")
    except FileNotFoundError:
        print("❌ npm not found. Please install npm")
        return False
    
    # Check Docker
    try:
        docker_version = subprocess.run(["docker", "--version"], capture_output=True, text=True)
        print(f"✅ Docker: {docker_version.stdout.strip()}")
    except FileNotFoundError:
        print("❌ Docker not found. Please install Docker")
        return False
    
    return True

def setup_python_backend():
    """Setup Python backend"""
    print("\n🐍 Setting up Python backend...")
    
    backend_dir = os.path.join(os.getcwd(), "backend")
    os.chdir(backend_dir)
    
    # Install Python dependencies
    if not run_command(f"{sys.executable} -m pip install -r requirements.txt"):
        print("❌ Failed to install Python dependencies")
        return False
    
    print("✅ Python backend setup complete")
    return True

def setup_frontend():
    """Setup frontend"""
    print("\n🌐 Setting up frontend...")
    
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    os.chdir(frontend_dir)
    
    # Install npm dependencies
    if not run_command("npm install"):
        print("❌ Failed to install npm dependencies")
        return False
    
    print("✅ Frontend setup complete")
    return True

def setup_milvus():
    """Setup Milvus database"""
    print("\n🗄️ Setting up Milvus database...")
    
    # Change to project root
    project_root = os.path.dirname(os.getcwd()) if os.path.basename(os.getcwd()) in ["backend", "frontend"] else os.getcwd()
    os.chdir(project_root)
    
    # Start Milvus
    if not run_command("docker-compose up -d"):
        print("❌ Failed to start Milvus")
        return False
    
    print("✅ Milvus database setup complete")
    return True

def create_startup_scripts():
    """Create startup scripts for different platforms"""
    print("\n📜 Creating startup scripts...")
    
    project_root = os.getcwd()
    
    # Windows batch script
    windows_script = """@echo off
title Face Recognition Application
echo ====================================
echo   Face Recognition Application
echo ====================================
echo.

echo Starting Milvus Database...
start "Milvus" cmd /c "docker-compose down && docker-compose up -d && echo Milvus ready! && pause"
timeout /t 10

echo Starting Python Backend...
cd backend
start "Backend" cmd /c "python app.py && pause"
cd ..

timeout /t 5

echo Starting Frontend...
cd frontend  
start "Frontend" cmd /c "npm run dev && pause"
cd ..

echo.
echo ====================================
echo   Application Started!
echo ====================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo Milvus:   http://localhost:19530
echo.
pause
"""
    
    with open(os.path.join(project_root, "start_windows.bat"), "w") as f:
        f.write(windows_script)
    
    # Unix shell script
    unix_script = """#!/bin/bash
echo "===================================="
echo "  Face Recognition Application"
echo "===================================="
echo

echo "Starting Milvus Database..."
docker-compose down
docker-compose up -d &
sleep 10

echo "Starting Python Backend..."
cd backend
python app.py &
sleep 5
cd ..

echo "Starting Frontend..."
cd frontend
npm run dev &
cd ..

echo
echo "===================================="
echo "  Application Started!"
echo "===================================="
echo
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"  
echo "Milvus:   http://localhost:19530"
echo
echo "Press Ctrl+C to stop all services"
wait
"""
    
    unix_script_path = os.path.join(project_root, "start_unix.sh")
    with open(unix_script_path, "w") as f:
        f.write(unix_script)
    
    # Make executable on Unix systems
    if platform.system() != "Windows":
        os.chmod(unix_script_path, 0o755)
    
    print("✅ Startup scripts created")
    return True

def main():
    """Main setup function"""
    print("🚀 Face Recognition Application Setup")
    print("=" * 50)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites check failed")
        sys.exit(1)
    
    # Setup backend
    if not setup_python_backend():
        print("\n❌ Backend setup failed")
        sys.exit(1)
    
    # Setup frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed")
        sys.exit(1)
    
    # Setup Milvus
    if not setup_milvus():
        print("\n❌ Milvus setup failed")
        sys.exit(1)
    
    # Create startup scripts
    if not create_startup_scripts():
        print("\n❌ Startup script creation failed")
        sys.exit(1)
    
    print("\n🎉 Setup Complete!")
    print("=" * 50)
    print("\nTo start the application:")
    
    if platform.system() == "Windows":
        print("1. Double-click start_windows.bat")
        print("   OR")
        print("2. Run: python setup.py")
    else:
        print("1. Run: ./start_unix.sh")
        print("   OR")
        print("2. Run: bash start_unix.sh")
    
    print("\nThen open http://localhost:3000 in your browser")
    print("\n✨ Features:")
    print("   📱 iPhone Face ID-like multi-angle registration")
    print("   🔍 Real-time face detection")
    print("   👤 Username display on recognition")
    print("   🧠 Advanced AI face recognition")

if __name__ == "__main__":
    main()

