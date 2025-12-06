import os
import shutil
import threading
import time
import uuid
from datetime import datetime

import cv2
import firebase_admin
import numpy as np
from deepface import DeepFace
from dotenv import load_dotenv
from firebase_admin import credentials, firestore, storage
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Allow all origins for all routes
CORS(app, resources={r"/*": {"origins": "*"}})


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers',
                         'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods',
                         'GET,PUT,POST,DELETE,OPTIONS')
    return response


# Initialize Firebase Admin
# TODO: User needs to provide serviceAccountKey.json
cred_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET",
                           "iot-cctv-ede95.firebasestorage.app")  # Default placeholder

if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': storage_bucket
    })
    db = firestore.client()
    bucket = storage.bucket()
    print(f"Firebase Admin initialized. Storage Bucket: {storage_bucket}")
else:
    print(
        f"Warning: Firebase credentials not found at {cred_path}. Database operations will fail.")
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
# Global state for alert cooldowns
last_alert_times = {}
ALERT_COOLDOWN = 60  # Seconds before alerting for the same person again
ALERT_KNOWN_PERSONS = False  # Default: Don't alert for known people

# Global state for servo positions
servo_state = {
    "pan": 90,
    "tilt": 90,
    "led": 0
}

# Global state for latest frame (for streaming)
latest_frame = None
lock = threading.Lock()


@app.route('/settings/alert-known', methods=['POST'])
def toggle_alert_known():
    global ALERT_KNOWN_PERSONS
    data = request.json
    ALERT_KNOWN_PERSONS = data.get('enabled', False)
    return jsonify({"status": "success", "enabled": ALERT_KNOWN_PERSONS})


@app.route('/settings/alert-known', methods=['GET'])
def get_alert_known():
    return jsonify({"enabled": ALERT_KNOWN_PERSONS})


@app.route('/settings/flashlight', methods=['GET'])
def get_flashlight():
    return jsonify({"enabled": servo_state.get('led', 0) == 1})


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
                    detected_name = os.path.basename(
                        os.path.dirname(identity_path))
                    distance = match['distance']

                    # STRICTER THRESHOLD for VGG-Face (Default is ~0.40, we want 0.30)
                    if distance > 0.30:
                        print(
                            f"DEBUG: Match found but distance {distance} > 0.30 (Too weak). Treating as Unknown.")
                        detected_name = "Unknown"
                        confidence = 0.0
                    else:
                        detected_name = os.path.basename(
                            os.path.dirname(identity_path))
                        confidence = max(0, (1 - distance) * 100)
                        print(
                            f"DEBUG: Match found: {detected_name}, Distance: {distance}")
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

        # --- Alert Logic ---
        should_alert = False
        alert_type = "unauthorized_access"

        if detected_name == "Unknown":
            should_alert = True
            print(f"🚨 UNKNOWN PERSON DETECTED! Triggering Alert...")
        elif ALERT_KNOWN_PERSONS:
            should_alert = True
            alert_type = "known_person_entry"
            print(
                f"🔔 KNOWN PERSON DETECTED ({detected_name})! Triggering Alert (Settings Enabled)...")
        else:
            print(
                f"Known person detected: {detected_name}. No alert sent (Settings Disabled).")
            return {
                "status": "success",
                "name": detected_name,
                "message": f"Detected {detected_name} (Known - No Alert)"
            }

        # Log to Firestore
        if should_alert and db:
            # Upload Image
            image_url = upload_image_to_storage(img)

            alert_ref = db.collection('alerts').document()
            alert_data = {
                "cameraName": "Simulator/ESP32",
                "timestamp": firestore.SERVER_TIMESTAMP,
                "type": alert_type,
                "status": "unknown" if detected_name == "Unknown" else "known",
                "personName": detected_name,
                "details": {
                    "name": detected_name,
                    "confidence": float(confidence)
                },
                "imageUrl": image_url
            }
            alert_ref.set(alert_data)
            print(f"Alert logged with Image URL: {image_url}")

        return {
            "status": "alerted",
            "name": detected_name,
            "message": f"Detected {detected_name} (Alert Sent)"
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
    pkl_path_facenet = os.path.join(
        FACES_DB_PATH, "representations_facenet.pkl")
    pkl_path_facenet512 = os.path.join(
        FACES_DB_PATH, "representations_facenet512.pkl")

    if os.path.exists(pkl_path_vgg):
        os.remove(pkl_path_vgg)
    if os.path.exists(pkl_path_facenet):
        os.remove(pkl_path_facenet)
    if os.path.exists(pkl_path_facenet512):
        os.remove(pkl_path_facenet512)

    return jsonify({"status": "success", "message": f"Registered {name}"})

# Stream Reader Thread (Removed: ESP32 will push images on motion)
# def capture_stream():
#     ...


@app.route('/detect', methods=['POST'])
def detect_person():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']

    # Convert to numpy array for OpenCV/DeepFace
    npimg = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if img is None:
        print("Error: Failed to decode image (Corrupt JPEG)")
        return jsonify({"error": "Failed to decode image"}), 400

    # Process the pushed frame
    result = process_frame(img, source="stream")

    # Update global frame for streaming (so dashboard still sees something)
    global latest_frame
    with lock:
        latest_frame = img.copy()

    # Add servo commands to response
    result["servo_cmd"] = servo_state

    return jsonify(result)


@app.route('/control', methods=['POST'])
def control_robot():
    global servo_state
    try:
        data = request.json
        if 'pan' in data:
            servo_state['pan'] = max(0, min(180, int(data['pan'])))
        if 'tilt' in data:
            servo_state['tilt'] = max(0, min(180, int(data['tilt'])))
        if 'led' in data:
            servo_state['led'] = 1 if data['led'] else 0

        # Send command to ESP32 directly
        try:
            import requests

            # Build params dict for ESP32
            esp32_params = {}
            if 'pan' in data:
                esp32_params['pan'] = servo_state['pan']
            if 'tilt' in data:
                esp32_params['tilt'] = servo_state['tilt']
            if 'led' in data:
                esp32_params['led'] = servo_state['led']

            response = requests.get(
                f"http://192.168.43.223/control", params=esp32_params, timeout=2)
            print(f"ESP32 Response: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Failed to forward command to ESP32: {e}")
            return jsonify({"status": "error", "message": f"ESP32 communication failed: {str(e)}", "state": servo_state}), 500

        print(f"Servo State Updated: {servo_state}")
        return jsonify({"status": "success", "state": servo_state})
    except Exception as e:
        print(f"Error updating servo state: {e}")
        return jsonify({"error": str(e)}), 400


@app.route('/stats', methods=['GET'])
def get_stats():
    try:
        # Count known persons (folders in faces_db)
        if os.path.exists(FACES_DB_PATH):
            known_persons = len([name for name in os.listdir(
                FACES_DB_PATH) if os.path.isdir(os.path.join(FACES_DB_PATH, name))])
        else:
            known_persons = 0

        return jsonify({
            "known_persons": known_persons,
            "active_cameras": 1,  # Currently hardcoded as we have one ESP32
            "status": "online"
        })
    except Exception as e:
        print(f"Error getting stats: {e}")
        return jsonify({"error": str(e)}), 500


def generate_frames():
    global latest_frame
    while True:
        with lock:
            if latest_frame is None:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(frame, "No Signal", (200, 240),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            else:
                frame = latest_frame

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.1)  # Limit to ~10 FPS to save bandwidth


@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
