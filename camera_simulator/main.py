import cv2
import time
import threading
import requests
import os
import numpy as np
from flask import Flask, Response
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", 0))
STREAM_PORT = int(os.getenv("STREAM_PORT", 5000))
UPLOAD_URL = os.getenv("UPLOAD_URL", "http://localhost:5001/detect")
CHECK_INTERVAL = 0.5  # Check for motion/faces every 0.5s
MOTION_THRESHOLD = 500000

# Global camera object
video_capture = cv2.VideoCapture(CAMERA_INDEX)

# Face Detection Model (Haar Cascade)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def upload_snapshot(frame):
    """Uploads a frame to the backend in a separate thread (Non-blocking)"""
    try:
        _, img_encoded = cv2.imencode('.jpg', frame)
        files = {'image': ('snapshot.jpg', img_encoded.tobytes(), 'image/jpeg')}
        # print(f"Uploading snapshot to {UPLOAD_URL}...")
        response = requests.post(UPLOAD_URL, files=files)
        print(f"✅ Upload Success: {response.json()}")
    except Exception as e:
        print(f"❌ Upload Failed: {e}")

def generate_frames():
    last_check_time = 0
    prev_gray = None
    
    while True:
        success, frame = video_capture.read()
        if not success:
            break
            
        # --- 1. INTELLIGENT DETECTION LOGIC (Simulating ESP32) ---
        current_time = time.time()
        if current_time - last_check_time > CHECK_INTERVAL:
            last_check_time = current_time
            
            # Create a small copy for processing (faster)
            small_frame = cv2.resize(frame, (640, 480))
            gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)
            
            if prev_gray is None:
                prev_gray = gray
            else:
                # Motion Detection
                frame_delta = cv2.absdiff(prev_gray, gray)
                thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
                change_score = np.sum(thresh)
                prev_gray = gray
                
                if change_score > MOTION_THRESHOLD:
                    # Motion detected, check for faces
                    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                    if len(faces) > 0:
                        print(f"📸 Face Detected! Triggering upload...")
                        # Fire and forget upload in a thread
                        threading.Thread(target=upload_snapshot, args=(frame.copy(),)).start()

        # --- 2. STREAMING LOGIC ---
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/stream')
def stream():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return "<h1>Smart Camera Simulator</h1><p>Stream at <a href='/stream'>/stream</a></p>"

if __name__ == '__main__':
    print(f"Starting Smart Camera Simulator on port {STREAM_PORT}...")
    app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True)
