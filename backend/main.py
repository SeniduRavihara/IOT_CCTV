import os
import firebase_admin
from firebase_admin import credentials, firestore, storage
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv
import cv2
import numpy as np
from deepface import DeepFace
from datetime import datetime
import uuid
import shutil
import threading
import time

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Firebase Admin
# TODO: User needs to provide serviceAccountKey.json
cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET", "iot-cctv-ede95.firebasestorage.app") # Default placeholder

if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': storage_bucket
    })
    db = firestore.client()
    bucket = storage.bucket()
    print(f"Firebase Admin initialized. Storage Bucket: {storage_bucket}")
else:
    print(f"Warning: Firebase credentials not found at {cred_path}. Database operations will fail.")
    db = None
    bucket = None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "firebase": db is not None})

# Ensure faces_db exists
FACES_DB_PATH = "faces_db"
if not os.path.exists(FACES_DB_PATH):
    os.makedirs(FACES_DB_PATH)

# Global state for alert cooldowns
last_alert_times = {}
ALERT_COOLDOWN = 60  # Seconds before alerting for the same person again

def upload_image_to_storage(img):
    """Uploads numpy image to Firebase Storage and returns public URL."""
    if not bucket:
        return ""
    
    try:
        # Encode image to JPEG
        _, buffer = cv2.imencode('.jpg', img)
        blob_name = f"alerts/incoming/{int(time.time())}_{uuid.uuid4()}.jpg"
        blob = bucket.blob(blob_name)
        
        blob.upload_from_string(buffer.tobytes(), content_type='image/jpeg')
        blob.make_public()
        
        return blob.public_url
    except Exception as e:
        print(f"Error uploading image: {e}")
        return ""

def process_frame(img, source="manual"):
    """
    Process a single image frame:
    1. Run Face Recognition
    2. Check Cooldown (if source is stream)
    3. Log to Firestore (ONLY IF UNKNOWN)
    Returns: dict with detection results
    """
    try:
        detected_name = "Unknown"
        confidence = 0.0
        
        try:
            # Run Face Recognition
            # Optimization: Pass numpy array directly, use Facenet (faster), and opencv detector (fastest)
            dfs = DeepFace.find(img_path=img, 
                              db_path=FACES_DB_PATH, 
                              model_name="VGG-Face",
                              detector_backend="opencv",
                              enforce_detection=False,
                              silent=True)
            
            if len(dfs) > 0:
                if not dfs[0].empty:
                    match = dfs[0].iloc[0]
                    identity_path = match['identity']
                    detected_name = os.path.basename(os.path.dirname(identity_path))
                    distance = match['distance']
                    
                    # STRICTER THRESHOLD for VGG-Face (Default is ~0.40, we want 0.30)
                    if distance > 0.30:
                        print(f"DEBUG: Match found but distance {distance} > 0.30 (Too weak). Treating as Unknown.")
                        detected_name = "Unknown"
                        confidence = 0.0
                    else:
                        detected_name = os.path.basename(os.path.dirname(identity_path))
                        confidence = max(0, (1 - distance) * 100)
                        print(f"DEBUG: Match found: {detected_name}, Distance: {distance}")
                else:
                    print("DEBUG: DeepFace returned empty dataframe (No match found)")
            else:
                print("DEBUG: DeepFace returned no results list")
                
        except Exception as e:
            print(f"DeepFace find error: {e}")
            pass
        
        # --- Cooldown Logic ---
        if source == "stream":
            last_time = last_alert_times.get(detected_name, 0)
            if time.time() - last_time < ALERT_COOLDOWN:
                print(f"Skipping alert for {detected_name} (Cooldown active)")
                return {
                    "status": "skipped",
                    "name": detected_name,
                    "message": f"Detected {detected_name} (Cooldown)"
                }
            
            # Update last alert time
            last_alert_times[detected_name] = time.time()

        # --- Alert Logic (README Alignment) ---
        # Only alert if the person is UNKNOWN
        if detected_name != "Unknown":
            print(f"Known person detected: {detected_name}. No alert sent.")
            return {
                "status": "success",
                "name": detected_name,
                "message": f"Detected {detected_name} (Known - No Alert)"
            }

        # Log to Firestore (Unknown Person)
        if db:
            print(f"🚨 UNKNOWN PERSON DETECTED! Uploading image and sending alert...")
            
            # Upload Image
            image_url = upload_image_to_storage(img)
            
            alert_ref = db.collection('alerts').document()
            alert_data = {
                "cameraName": "Simulator/ESP32", 
                "timestamp": firestore.SERVER_TIMESTAMP,
                "type": "unauthorized_access", # More specific type
                "status": "unknown",
                "personName": "Unknown",
                "details": {
                    "name": "Unknown",
                    "confidence": float(confidence)
                },
                "imageUrl": image_url
            }
            alert_ref.set(alert_data)
            print(f"Alert logged with Image URL: {image_url}")
            
        return {
            "status": "alerted", 
            "name": "Unknown", 
            "message": "Detected Unknown Person (Alert Sent)"
        }

    except Exception as e:
        print(f"Error in detection: {e}")
        return {"error": str(e)}

@app.route('/register', methods=['POST'])
def register_face():
    if 'image' not in request.files or 'name' not in request.form:
        return jsonify({"error": "Missing image or name"}), 400
    
    file = request.files['image']
    name = request.form['name']
    
    # Create directory for person
    person_dir = os.path.join(FACES_DB_PATH, name)
    if not os.path.exists(person_dir):
        os.makedirs(person_dir)
    
    # Save image
    filename = f"{uuid.uuid4()}.jpg"
    file_path = os.path.join(person_dir, filename)
    file.save(file_path)
    
    # Delete representations pkl to force re-indexing
    pkl_path_vgg = os.path.join(FACES_DB_PATH, "representations_vgg_face.pkl")
    pkl_path_facenet = os.path.join(FACES_DB_PATH, "representations_facenet.pkl")
    pkl_path_facenet512 = os.path.join(FACES_DB_PATH, "representations_facenet512.pkl")
    
    if os.path.exists(pkl_path_vgg):
        os.remove(pkl_path_vgg)
    if os.path.exists(pkl_path_facenet):
        os.remove(pkl_path_facenet)
    if os.path.exists(pkl_path_facenet512):
        os.remove(pkl_path_facenet512)
        
    return jsonify({"status": "success", "message": f"Registered {name}"})

@app.route('/detect', methods=['POST'])
def detect_person():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    
    # Convert to numpy array for OpenCV/DeepFace
    npimg = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    
    result = process_frame(img, source="stream")
    return jsonify(result)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
