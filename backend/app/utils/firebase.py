import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

_db = None


def initialize_firebase() -> None:
    """Initialize Firebase Admin SDK. Safe to call multiple times."""
    try:
        firebase_admin.get_app()
        return  # Already initialized
    except ValueError:
        pass

    # Local development: use service account JSON file from keys/
    keys_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'keys')
    key_files = [f for f in os.listdir(keys_dir) if f.endswith('.json')] if os.path.isdir(keys_dir) else []

    if key_files:
        cred_path = os.path.join(keys_dir, key_files[0])
        cred = credentials.Certificate(cred_path)
        print(f"✅ Firebase initialized with local key: {key_files[0]}")

    # Production (Railway): use full JSON blob in env var
    elif os.environ.get('FIREBASE_CREDENTIALS'):
        cred = credentials.Certificate(json.loads(os.environ['FIREBASE_CREDENTIALS']))
        print("✅ Firebase initialized with FIREBASE_CREDENTIALS env var.")

    # Production (Railway): use individual env vars
    elif os.environ.get('FIREBASE_PROJECT_ID'):
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
            "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
            "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        print("✅ Firebase initialized with individual env vars.")

    else:
        raise RuntimeError(
            "No Firebase credentials found. Provide a keys/*.json file, "
            "FIREBASE_CREDENTIALS, or FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL."
        )

    firebase_admin.initialize_app(cred)


def get_db() -> firestore.Client:
    """Return a singleton Firestore client."""
    global _db
    if _db is None:
        _db = firestore.client()
    return _db