# IOT CCTV Face Recognition System - Deployment Guide

## 🎉 Ready-to-Deploy Package

**This system is pre-configured and ready to use!** All Firebase credentials and environment files are included. Just install dependencies and run!

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [ESP32 Firmware Setup](#esp32-firmware-setup)
6. [Firebase Configuration](#firebase-configuration)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

This is a real-time face recognition security system with three main components:

- **Backend (Python Flask)**: AI-powered face recognition using ArcFace model
- **Frontend (Next.js)**: Web dashboard for monitoring alerts and managing cameras
- **ESP32-CAM Firmware**: Smart camera with motion detection and live streaming

### System Architecture

```
ESP32-CAM → Motion Detection → Backend (AI Recognition) → Firebase → Dashboard
     ↓                                                                    ↑
Live Stream --------------------------------------------------------→ Direct View
```

---

## ✅ Prerequisites

### Required Software

- Python 3.8 or higher
- Node.js 18 or higher
- Arduino IDE (for ESP32 programming)
- Git (optional, for version control)

### Required Hardware

- ESP32-CAM (AI-Thinker model)
- 2x Servo Motors (for pan/tilt mechanism)
- USB to Serial programmer for ESP32
- WiFi router/access point

### Firebase (Already Configured!)

**✅ No Firebase account needed!** All credentials are included in the delivery package.

---

## 🔧 Backend Setup

### Step 1: Install Python Dependencies

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

### Step 2: Run the Backend

```bash
python main.py
```

The backend will start on `http://127.0.0.1:5001`

**Expected output:**

```
Firebase Admin initialized. Storage Bucket: your-project-id.firebasestorage.app
Loaded X known faces from database
 * Running on http://127.0.0.1:5001
```

### Adding Known Faces

**Use the Dashboard UI** to register people:

1. Open dashboard → "Known Persons" page
2. Click "Add Person"
3. Upload 10-20 photos of the person
4. System automatically saves to database

### Backend API Endpoints

| Endpoint               | Method | Description                 |
| ---------------------- | ------ | --------------------------- |
| `/detect`              | POST   | Face recognition from ESP32 |
| `/control`             | POST   | Control ESP32 (servo/LED)   |
| `/settings/flashlight` | GET    | Get flashlight state        |
| `/stats`               | GET    | Get system statistics       |
| `/cameras`             | GET    | Get registered cameras      |

---

## 🌐 Frontend Setup

### Step 1: Install Node.js Dependencies

```bash
cd frontend
npm install
```

### Step 2: Update Backend URL (If Needed)

If your backend is running on a different IP address, update the API URLs in:

- `src/app/(dashboard)/dashboard/page.tsx`
- Other components that call backend APIs

Change `http://127.0.0.1:5001` to your backend server IP.

### Step 3: Run the Frontend

**Development mode:**

```bash
npm run dev
```

Access at `http://localhost:3000`

**Production mode:**

```bash
npm run build
npm start
```

### Step 4: Create User Account & Start Using

1. Open browser to `http://localhost:3000`
2. Click "Register" to create your account
3. Login with your credentials
4. Go to **"Known Persons"** page to add people to recognize
5. Upload photos through the web interface (3-5 photos per person)
6. System is ready to detect and recognize faces!

**Note:** All face registration is done through the dashboard - no manual folder/file management needed!

---

## 📡 ESP32 Firmware Setup

**✅ ESP32-CAM comes pre-programmed!** Just power on and use, or re-program if you need to change WiFi/backend settings.

### Option A: Use Pre-Programmed Module (Recommended)

1. **Power the ESP32-CAM** (5V, 2A power supply)
2. **Find IP address** in your WiFi router's connected devices
3. **Test:** Open `http://ESP32_IP/stream` in browser

The module is already configured with WiFi and backend URL.

### Option B: Re-Program for Different WiFi/Backend

**If you need to change WiFi credentials or backend IP:**

1. **Update configuration** in `esp32_firmware/esp32_cam.ino`:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* server_url = "http://YOUR_BACKEND_IP:5001/detect";
```

2. **Connect ESP32 to computer:**
3. **Upload using Arduino IDE:**

### Hardware Connections

### Hardware Connections

**Servos (Optional):**

- Pan Servo → GPIO 12
- Tilt Servo → GPIO 13
- Servo Power → 5V external supply (not ESP32 5V pin)
- Servo Ground → Common ground with ESP32

**Flashlight:** GPIO 4 (built-in LED)

### ESP32 Endpoints

| Endpoint                                 | Description       |
| ---------------------------------------- | ----------------- |
| `http://ESP32_IP/`                       | Status page       |
| `http://ESP32_IP/stream`                 | Live MJPEG stream |
| `http://ESP32_IP/control?pan=90&tilt=90` | Control servos    |
| `http://ESP32_IP/control?led=1`          | Flashlight on/off |

---

## 🔥 Firebase Configuration

### ✅ Firebase is Already Configured!

**No setup required!** The system comes with:

- ✅ Firebase project created and configured
- ✅ Firestore Database enabled
- ✅ Firebase Storage enabled
- ✅ Authentication (Email/Password) enabled
- ✅ Security rules configured
- ✅ All credentials included in the package

**You can start using the system immediately!**

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: "ModuleNotFoundError: No module named 'deepface'"**

- **Solution:** Activate virtual environment and run `pip install -r requirements.txt`

**Problem: "Firebase credentials not found"**

- **Solution:** Ensure `serviceAccountKey.json` is in the `backend` folder

**Problem: "No known faces loaded"**

- **Solution:** Use the dashboard "Known Persons" page to add people (don't add files manually!)

**Problem: Backend crashes on first face detection**

- **Solution:** Wait for DeepFace to download ArcFace model (~150MB, first run only)

### Frontend Issues

**Problem: "Cannot connect to backend"**

- **Solution:** Check backend is running on correct IP/port. Update API URLs in frontend code.

**Problem: "Firebase auth error"**

- **Solution:** Verify `firebaseConfig` in `src/lib/firebase/config.ts` matches your project

**Problem: "Images not loading in dashboard"**

- **Solution:** Check Firebase Storage rules allow read access for authenticated users

### ESP32 Issues

**Problem: "Failed to connect to WiFi"**

- **Solution:** Double-check SSID and password. Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)

**Problem: "Camera init failed"**

- **Solution:** Check ESP32-CAM board quality. Try lowering `config.xclk_freq_hz` to 10000000

**Problem: "Backend connection timeout"**

- **Solution:** Verify backend URL is correct. Ping backend IP from another device on same network.

**Problem: "Motion detection too sensitive/not sensitive"**

- **Solution:** Adjust `MOTION_THRESHOLD` in firmware (line 217). Lower = more sensitive, Higher = less sensitive

**Problem: "Stream is choppy"**

- **Solution:** Reduce `FRAMESIZE_SVGA` to `FRAMESIZE_VGA` or increase `jpeg_quality` value

### Network Issues

**Problem: "ESP32 and Backend not communicating"**

- **Solution:**
  - Ensure all devices on same network
  - Disable firewall temporarily to test
  - Use IP address instead of hostname

**Problem: "Live stream not working in dashboard"**

- **Solution:**
  - Check ESP32 IP is correct in camera settings
  - Access stream directly: `http://ESP32_IP/stream`
  - Check browser console for CORS errors

---

## 📊 System Requirements

### Backend Server

- **CPU:** 2+ cores (4+ recommended for faster AI processing)
- **RAM:** 4GB minimum (8GB recommended)
- **Storage:** 10GB free space (for AI models and debug frames)
- **OS:** Windows 10/11, Ubuntu 20.04+, macOS 10.15+

### Frontend Server

- Can run on same machine as backend
- Minimal resources needed (1GB RAM sufficient)

### Network

- All devices must be on same local network
- Recommended: Wired connection for backend server
- ESP32 requires 2.4GHz WiFi (not 5GHz)

---

## 🔐 Security Recommendations

1. **Keep `serviceAccountKey.json` secure** - Never share or commit to public repositories
2. **Keep `.env` files secure** - Contains sensitive configuration
3. **Use strong WiFi password** for ESP32 network
4. **Create strong user passwords** in the application
5. **Don't expose backend port** to internet without VPN/authentication
6. **Regularly update** dependencies for security patches
7. **Firebase security rules are already configured** for production use

---

## 📞 Support

For issues or questions:

1. Check this documentation
2. Review error messages in Serial Monitor (ESP32) or terminal (Backend/Frontend)
3. Check Firebase Console for quota/error messages
4. Verify all configuration files are correct

---

## 📝 System Features

- ✅ Real-time face recognition with ArcFace AI model (99.8% accuracy)
- ✅ Motion-activated detection to save bandwidth
- ✅ Live MJPEG video streaming (800x600 @ 25-30 FPS)
- ✅ Pan/Tilt camera control via servos
- ✅ Flashlight control
- ✅ Web dashboard with alerts history
- ✅ Firebase cloud storage for images
- ✅ Email notifications (if configured)
- ✅ Multi-camera support
- ✅ Known vs Unknown person classification
- ✅ Debug frame saving for troubleshooting

---

**Version:** 1.0  
**Last Updated:** December 2025
