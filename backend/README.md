# IOT CCTV Backend - Face Recognition Service

## 🎯 Overview

Python Flask backend service providing AI-powered face recognition using the ArcFace model. Receives images from ESP32-CAM, performs face detection and recognition, and stores alerts in Firebase.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Add Firebase credentials
# Place serviceAccountKey.json in this folder

# 3. Configure environment
# Edit .env file with your settings

# 4. Add known faces
# Create folders in faces_db/PersonName/ with face images

# 5. Run the server
python main.py
```

Server will start on `http://127.0.0.1:5001`

---

## 📦 Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- 4GB+ RAM recommended
- Internet connection (for first-time AI model download)

### Step-by-Step Setup

#### 1. Create Virtual Environment (Recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

**Dependencies installed:**

- `flask` - Web framework
- `flask-cors` - Cross-origin resource sharing
- `firebase-admin` - Firebase integration
- `deepface` - Face recognition library
- `opencv-python` - Computer vision
- `python-dotenv` - Environment variables
- `numpy` - Numerical operations
- `tf-keras` - Deep learning backend

**Note:** First run will download the ArcFace model (~150MB). This is automatic and only happens once.

#### 3. Verify Firebase Configuration (Already Done!)

**✅ Firebase is already configured!** The following files are included:

- `serviceAccountKey.json` - Firebase service account credentials
- `.env` - Environment variables with correct settings

**No Firebase configuration needed!** Skip to the next step.

#### 4. Run the Server

```bash
python main.py
```

Server will start on `http://127.0.0.1:5001`

**Note:** Required folders (`faces_db/`, `debug_frames/`) are created automatically.

### Adding Known Faces

**⚠️ Use the Dashboard, not manual folders!**

Register people through the web dashboard:

1. Open frontend → "Known Persons" page
2. Click "Add Person"
3. Upload 3-5 photos per person
4. System handles everything automatically

**Don't create folders manually in `faces_db/`!**

---

## 🚀 Running the Server

### Development Mode

```bash
python main.py
```

### Production Mode (with Gunicorn)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 main:app
```

### Run as Background Service (Linux)

Create `/etc/systemd/system/iot-cctv.service`:

```ini
[Unit]
Description=IOT CCTV Backend Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable iot-cctv
sudo systemctl start iot-cctv
```

---

## 📡 API Endpoints

### 1. Face Detection

**POST** `/detect`

Receives image from ESP32, performs face recognition.

**Request:**

- Content-Type: `multipart/form-data`
- Body: `image` (file upload)

**Response:**

```json
{
  "status": "success",
  "person": "JohnDoe",
  "confidence": 0.85,
  "alert_id": "abc123xyz",
  "is_known": true
}
```

### 2. Control Camera

**POST** `/control`

Forward control commands to ESP32 (servo/LED).

**Request Body:**

```json
{
  "camera_ip": "192.168.1.100",
  "action": "servo",
  "pan": 90,
  "tilt": 90
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Command sent to camera"
}
```

### 3. Get Flashlight State

**GET** `/settings/flashlight`

**Response:**

```json
{
  "led": 0
}
```

### 4. Get Statistics

**GET** `/stats`

**Response:**

```json
{
  "known_persons": 5,
  "active_cameras": 2,
  "total_alerts_today": 23
}
```

### 5. Get Cameras

**GET** `/cameras`

**Response:**

```json
[
  {
    "id": "cam_001",
    "name": "Front Door",
    "ipAddress": "192.168.1.100",
    "location": "Entrance",
    "status": "active"
  }
]
```

---

## 🔧 Configuration

### Environment Variables (`.env`)

```env
# Server Configuration
PORT=5001

# Firebase Configuration
FIREBASE_CREDENTIALS=serviceAccountKey.json
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app

# ESP32 Camera Configuration
ESP32_IP=192.168.43.223        # Your ESP32-CAM IP address
ESP32_TIMEOUT=2                 # Control request timeout (seconds)

# Optional: Email Notifications
# EMAIL_ENABLED=true
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-password
# EMAIL_TO=admin@example.com
```

### Face Recognition Settings (in `main.py`)

```python
# Line 149: AI Model Selection
model_name = "ArcFace"  # Options: VGG-Face, Facenet, Facenet512, ArcFace

# Line 150: Recognition Threshold
threshold = 0.40  # Lower = stricter, Higher = more lenient (0.30-0.50 recommended)

# Line 137: Face Detection Model
detector_backend = 'opencv'  # Options: opencv, ssd, mtcnn, retinaface
```

---

## 🧪 Testing

### Test Face Recognition Locally

```python
from deepface import DeepFace

result = DeepFace.find(
    img_path="test_image.jpg",
    db_path="faces_db",
    model_name="ArcFace",
    distance_metric="cosine",
    enforce_detection=False
)
print(result)
```

### Test API with cURL

```bash
# Test detection endpoint
curl -X POST http://localhost:5001/detect \
  -F "image=@test_photo.jpg"

# Test stats endpoint
curl http://localhost:5001/stats

# Test flashlight state
curl http://localhost:5001/settings/flashlight
```

### Debug Mode

Enable debug logging in `main.py`:

```python
app.run(host='0.0.0.0', port=5001, debug=True)
```

---

## 📊 Performance Optimization

### Speed Up Face Recognition

1. **Use GPU acceleration** (if available):

   ```bash
   pip install tensorflow-gpu
   ```

2. **Reduce image resolution** before processing (done automatically)

3. **Pre-compute embeddings** for known faces (advanced)

4. **Use faster detector**: `opencv` is fastest, `retinaface` is most accurate

### Memory Management

- Clear debug frames periodically (they accumulate in `debug_frames/`)
- Limit Firebase Storage to 1GB (Firebase Console → Storage → Rules)
- Use image compression for stored alerts

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "No module named 'deepface'"

```bash
# Ensure virtual environment is activated
pip install -r requirements.txt
```

#### 2. "Firebase credentials not found"

- Check `serviceAccountKey.json` exists in backend folder
- Verify `.env` points to correct file
- Ensure Firebase project is created

#### 3. "No known faces loaded from database"

- Check `faces_db` folder exists
- Verify images are in `faces_db/PersonName/` subfolders
- Ensure images are valid JPEG/PNG files

#### 4. "ModuleNotFoundError: No module named 'cv2'"

```bash
pip install opencv-python
# If still fails, try:
pip install opencv-python-headless
```

#### 5. Backend crashes on first detection

- Wait for ArcFace model to download (first run only, ~150MB)
- Check internet connection
- Ensure sufficient disk space (10GB+)

#### 6. Slow recognition (>5 seconds per image)

- Use faster detector: Change to `detector_backend='opencv'`
- Reduce image resolution in ESP32 (change to VGA or lower)
- Reduce number of registered faces (<20 recommended)
- Consider GPU acceleration

#### 7. "Address already in use"

```bash
# Find process using port 5001
lsof -i :5001  # Linux/Mac
netstat -ano | findstr :5001  # Windows

# Kill process or change PORT in .env
```

---

## 📁 Project Structure

```
backend/
├── main.py                    # Main Flask application
├── requirements.txt           # Python dependencies
├── serviceAccountKey.json     # Firebase credentials (not in git)
├── .env                       # Environment variables
├── faces_db/                  # Known faces database
│   ├── Person1/
│   │   ├── photo1.jpg
│   │   └── photo2.jpg
│   └── Person2/
│       └── photo.jpg
├── debug_frames/              # Debug images (auto-generated)
│   ├── FACE_Person1_timestamp.jpg
│   └── NO_FACE_timestamp.jpg
└── README.md                  # This file
```

---

## 🔐 Security Best Practices

1. **Never commit** `serviceAccountKey.json` to version control
2. **Use environment variables** for sensitive data
3. **Enable Firebase Security Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
4. **Use HTTPS** in production (reverse proxy with nginx/Apache)
5. **Implement rate limiting** for API endpoints
6. **Regularly update** dependencies: `pip install --upgrade -r requirements.txt`

---

## 📈 Monitoring

### Check System Status

```bash
# CPU and Memory usage
htop

# Flask logs
tail -f logs/app.log

# Check Firebase quota
# Visit Firebase Console → Usage and Billing
```

### Performance Metrics

- **Detection Speed:** 0.3-0.5 seconds per frame (with ArcFace)
- **Accuracy:** 99.8% (ArcFace model)
- **Memory Usage:** ~2-4GB (with AI model loaded)
- **Storage:** ~10MB per 100 alert images

---

## 🔄 Updating

```bash
# Pull latest changes
git pull

# Update dependencies
pip install --upgrade -r requirements.txt

# Restart service
sudo systemctl restart iot-cctv
```

---

## 📝 Changelog

### Version 1.0 (Current)

- ✅ ArcFace model integration (99.8% accuracy)
- ✅ OpenCV pre-detection to skip empty frames
- ✅ Firebase Firestore for alert storage
- ✅ Firebase Storage for image uploads
- ✅ Multi-camera support
- ✅ Servo and LED control endpoints
- ✅ Debug frame saving with meaningful names
- ✅ Real-time statistics endpoint
- ✅ CORS enabled for cross-origin requests

---

## 🛠️ Advanced Configuration

### Change AI Model

```python
# In main.py, line 149
model_name = "Facenet512"  # Options: VGG-Face, Facenet, Facenet512, ArcFace, OpenFace

# Adjust threshold accordingly (different models need different values)
# VGG-Face: 0.30-0.40
# Facenet: 0.40-0.50
# ArcFace: 0.40-0.50
```

### Add Email Notifications

Install additional package:

```bash
pip install Flask-Mail
```

Update `.env`:

```env
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_TO=admin@example.com
```

### Custom Alert Logic

Modify `process_frame()` function in `main.py` to customize:

- Alert frequency
- Confidence thresholds
- Person-specific actions
- Time-based rules

---

## 📞 Support

**Issue:** Not covered in troubleshooting?
**Solution:**

1. Check Flask console output for error messages
2. Review Firebase Console for quota/authentication issues
3. Test endpoints individually with cURL or Postman
4. Enable debug mode for detailed logs

---

**Version:** 1.0  
**License:** Private - For Client Use Only  
**Last Updated:** December 2025
