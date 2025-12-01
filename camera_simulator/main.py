import cv2
import time
import threading
import requests
import os
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
UPLOAD_URL = os.getenv("UPLOAD_URL", "http://localhost:5001/detect") # URL to POST images to
UPLOAD_INTERVAL = int(os.getenv("UPLOAD_INTERVAL", 5))  # Seconds between uploads

# Global camera object
video_capture = cv2.VideoCapture(CAMERA_INDEX)

def generate_frames():
    while True:
        success, frame = video_capture.read()
        if not success:
            break
        else:
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            # Yield frame in MJPEG format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

def upload_loop():
    """Background thread to upload images periodically."""
    if not UPLOAD_URL:
        print("No UPLOAD_URL configured. Skipping image uploads.")
        return

    while True:
        try:
            success, frame = video_capture.read()
            if success:
                _, buffer = cv2.imencode('.jpg', frame)
                # Simulate ESP32 POST request
                # ESP32 usually sends raw bytes or multipart/form-data
                # Here we send as a file in multipart/form-data
                files = {'image': ('capture.jpg', buffer.tobytes(), 'image/jpeg')}
                response = requests.post(UPLOAD_URL, files=files)
                print(f"Uploaded image. Status: {response.status_code}")
            
            time.sleep(UPLOAD_INTERVAL)
        except Exception as e:
            print(f"Error uploading image: {e}")
            time.sleep(UPLOAD_INTERVAL)

@app.route('/stream')
def stream():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return "<h1>Camera Simulator Running</h1><p>Stream available at <a href='/stream'>/stream</a></p>"

if __name__ == '__main__':
    # Start upload thread if URL is provided
    if UPLOAD_URL:
        threading.Thread(target=upload_loop, daemon=True).start()
    
    print(f"Starting Camera Simulator on port {STREAM_PORT}...")
    app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True)
