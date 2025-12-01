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

@app.route('/stream')
def stream():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return "<h1>Camera Simulator Running</h1><p>Stream available at <a href='/stream'>/stream</a></p>"

if __name__ == '__main__':
    print(f"Starting Camera Simulator on port {STREAM_PORT}...")
    app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True)
