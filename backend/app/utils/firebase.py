# backend/app/utils/firebase.py
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if already initialized
        if firebase_admin._apps:
            print("Firebase already initialized")
            return

        # Try to get credentials from environment variable
        firebase_creds = os.environ.get("FIREBASE_CREDENTIALS")

        if firebase_creds:
            cred_dict = json.loads(firebase_creds)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized with FIREBASE_CREDENTIALS")
            return

        # Try to use local service account file from keys directory
        cred_path = "keys/service-account-key.json"
        if not os.path.exists(cred_path):
            keys_dir = "keys"
            if os.path.isdir(keys_dir):
                json_files = [f for f in os.listdir(keys_dir) if f.endswith(".json")]
                if json_files:
                    cred_path = os.path.join(keys_dir, json_files[0])

        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print(f"Firebase initialized with local file: {cred_path}")
            return

        raise RuntimeError(
            "No Firebase credentials found. Provide a keys/*.json file, "
            "FIREBASE_CREDENTIALS, or FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL."
        )
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        raise

def get_db():
    """Get Firestore database instance"""
    if not firebase_admin._apps:
        initialize_firebase()
    return firestore.client()

def get_auth():
    """Get Firebase Auth instance"""
    if not firebase_admin._apps:
        initialize_firebase()
    return auth