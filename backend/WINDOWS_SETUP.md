# Windows Backend Setup Guide

## Prerequisites
- Python 3.8 or higher installed
- PowerShell

## Setup Instructions

Open PowerShell in the `backend` directory and run the following commands:

### 1. Create Virtual Environment
```powershell
python -m venv venv
```

### 2. Activate Virtual Environment
```powershell
.\venv\Scripts\Activate
```
*Note: If you get a permission error, run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` first.*

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Configure Environment
Ensure you have the following files in the `backend` folder:
- `serviceAccountKey.json` (Firebase credentials)
- `.env` (Environment variables)

### 5. Run the Server
```powershell
python main.py
```

The server will start at `http://127.0.0.1:5001`.
