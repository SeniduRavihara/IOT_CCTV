import os
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Firebase Admin
# TODO: User needs to provide serviceAccountKey.json
cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin initialized successfully.")
else:
    print(f"Warning: Firebase credentials not found at {cred_path}. Database operations will fail.")
    db = None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "firebase": db is not None})

import cv2
import numpy as np
from deepface import DeepFace
from datetime import datetime
import uuid

# ... (imports remain the same)

import cv2
import numpy as np
from deepface import DeepFace
from datetime import datetime
import uuid
import shutil

# ... (imports remain the same)

# Ensure faces_db exists
FACES_DB_PATH = "faces_db"
if not os.path.exists(FACES_DB_PATH):
    os.makedirs(FACES_DB_PATH)

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
    pkl_path = os.path.join(FACES_DB_PATH, "representations_vgg_face.pkl")
    if os.path.exists(pkl_path):
        os.remove(pkl_path)
        
    return jsonify({"status": "success", "message": f"Registered {name}"})

@app.route('/detect', methods=['POST'])
def detect_person():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    
    # Convert to numpy array for OpenCV/DeepFace
    npimg = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    
    try:
        # Save temp image for DeepFace (it prefers paths for find())
        temp_filename = f"temp_{uuid.uuid4()}.jpg"
        cv2.imwrite(temp_filename, img)
        
        detected_name = "Unknown"
        confidence = 0.0
        
        try:
            # Run Face Recognition
            print(f"Searching for face in {FACES_DB_PATH}...")
            dfs = DeepFace.find(img_path=temp_filename, 
                              db_path=FACES_DB_PATH, 
                              model_name="VGG-Face",
                              enforce_detection=False,
                              silent=True)
            
            if len(dfs) > 0:
                print(f"DeepFace returned {len(dfs)} dataframes")
                if not dfs[0].empty:
                    match = dfs[0].iloc[0]
                    print(f"Match found: {match}")
                    identity_path = match['identity']
                    detected_name = os.path.basename(os.path.dirname(identity_path))
                    distance = match['distance']
                    confidence = max(0, (1 - distance) * 100)
                else:
                    print("First dataframe is empty (No match found)")
            else:
                print("DeepFace returned no results")
                
        except Exception as e:
            print(f"DeepFace find error: {e}")
            pass
        finally:
            # Cleanup temp file
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
        
        # Log to Firestore
        if db:
            alert_ref = db.collection('alerts').document()
            alert_data = {
                "cameraName": "Simulator/ESP32", 
                "timestamp": firestore.SERVER_TIMESTAMP,
                "type": "person_detection",
                "status": "known" if detected_name != "Unknown" else "unknown",
                "personName": detected_name,
                "details": {
                    "name": detected_name,
                    "confidence": float(confidence)
                },
                "imageUrl": "" # TODO: Upload to Firebase Storage
            }
            alert_ref.set(alert_data)
            
        return jsonify({
            "status": "success", 
            "name": detected_name, 
            "message": f"Detected {detected_name}"
        })

    except Exception as e:
        print(f"Error in detection: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
