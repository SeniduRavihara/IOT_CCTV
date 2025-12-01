import cv2
import numpy as np
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

CAMERA_STREAM_URL = os.getenv("CAMERA_STREAM_URL", "http://localhost:5000/stream")
BACKEND_API_URL = "http://localhost:5001/detect"

CHECK_INTERVAL = 0.5 # Check every 0.5s
MOTION_THRESHOLD = 500000

def monitor_stream():
    print(f"Watcher started. Monitoring {CAMERA_STREAM_URL}...")
    
    # Load Haar Cascade
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    prev_gray = None
    last_check_time = 0
    
    while True:
        try:
            cap = cv2.VideoCapture(CAMERA_STREAM_URL)
            if cap.isOpened():
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        print("Stream interrupted. Reconnecting...")
                        break
                    
                    current_time = time.time()
                    if current_time - last_check_time > CHECK_INTERVAL:
                        last_check_time = current_time
                        
                        # 1. Resize & Grayscale
                        small_frame = cv2.resize(frame, (640, 480))
                        gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
                        gray = cv2.GaussianBlur(gray, (21, 21), 0)
                        
                        if prev_gray is None:
                            prev_gray = gray
                            continue
                            
                        # 2. Motion Detection
                        frame_delta = cv2.absdiff(prev_gray, gray)
                        thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
                        change_score = np.sum(thresh)
                        prev_gray = gray
                        
                        if change_score > MOTION_THRESHOLD:
                            # 3. Face Presence Check
                            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                            
                            if len(faces) > 0:
                                print(f"Face detected! Sending snapshot to API...")
                                
                                # Send to Backend API
                                try:
                                    _, img_encoded = cv2.imencode('.jpg', frame)
                                    files = {'image': ('snapshot.jpg', img_encoded.tobytes(), 'image/jpeg')}
                                    response = requests.post(BACKEND_API_URL, files=files)
                                    print(f"API Response: {response.json()}")
                                except Exception as e:
                                    print(f"Failed to send to API: {e}")
                                    
                                # Cooldown to avoid spamming the API
                                time.sleep(1) 
                            else:
                                # print("Motion but no face.")
                                pass
                                
                cap.release()
            else:
                print("Could not connect to stream. Retrying in 5s...")
                time.sleep(5)
                
        except Exception as e:
            print(f"Watcher Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    monitor_stream()
