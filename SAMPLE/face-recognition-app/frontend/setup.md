# Face Recognition System Setup Guide

## 🚨 **Why "No matching person found" appears:**

The issue occurs because:
1. **No persons are registered** in the database yet
2. **Milvus database** might not be running
3. **Python dependencies** are not installed
4. **Backend is not running** properly

## 📋 **Step-by-Step Setup:**

### 1. **Install Python** (if not already installed)
- Go to https://www.python.org/downloads/
- Download Python 3.8 or higher
- **IMPORTANT**: Check "Add Python to PATH" during installation

### 2. **Install Python Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

### 3. **Start Milvus Database**
```bash
# Using Docker (recommended)
docker-compose up -d

# Or install Milvus standalone
# Follow instructions at: https://milvus.io/docs/install_standalone-docker.md
```

### 4. **Start the Backend**
```bash
cd backend
python app.py
```

### 5. **Start the Frontend**
```bash
npm run dev
```

## 🔧 **How the System Works:**

### **Registration Process:**
1. User uploads photo + enters name
2. Photo uploaded to Cloudinary
3. Face embedding generated using DeepFace
4. Embedding stored in Milvus vector database
5. Success message shown

### **Detection Process:**
1. User captures photo from webcam
2. Face embedding generated from captured photo
3. System searches Milvus for similar embeddings
4. If match found: shows person's name + confidence
5. If no match: shows "No matching person found"

## 🐛 **Troubleshooting:**

### **"No matching person found" - Solutions:**

1. **Register a person first:**
   - Upload a clear photo
   - Enter the person's name
   - Wait for success message

2. **Check Milvus connection:**
   ```bash
   # Test if Milvus is running
   curl http://localhost:19530/health
   ```

3. **Check backend logs:**
   - Look for error messages in the terminal
   - Ensure all dependencies are installed

4. **Test face detection:**
   - Make sure photo has a clear, front-facing face
   - Good lighting conditions
   - No obstructions (glasses, masks, etc.)

## 📊 **Database Status:**

To check if persons are registered:
```python
from milvus_client import get_all_faces
faces = get_all_faces()
print(f"Registered persons: {len(faces)}")
for face in faces:
    print(f"- {face['name']}")
```

## 🎯 **Expected Flow:**

1. **First time**: Register at least one person
2. **Detection**: Use webcam to detect registered persons
3. **Results**: See person's name and confidence level

## 🔍 **Debug Information:**

The system logs important information:
- ✅ Connection status
- ✅ Face detection results
- ✅ Database operations
- ❌ Error messages

Check the terminal output for these logs to identify issues.

