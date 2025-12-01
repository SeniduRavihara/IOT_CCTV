import firebase_admin
from firebase_admin import credentials, storage
import os

cred_path = "/home/senidu/PROJECTS/IOT_CCTV/backend/serviceAccountKey.json"
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    
    print("Listing buckets...")
    try:
        client = storage.storage.Client(credentials=cred.get_credential())
        buckets = list(client.list_buckets())
        for bucket in buckets:
            print(f"Found bucket: {bucket.name}")
    except Exception as e:
        print(f"Error listing buckets: {e}")
else:
    print("Credential file not found.")
