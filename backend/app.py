import os
import io
import subprocess
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import json

import numpy as np
import faiss
import cv2
from insightface.app import FaceAnalysis
import firebase_admin
from firebase_admin import credentials, firestore, storage

# --- Flask Setup ---
app = Flask(__name__)
CORS(app)

# --- Firebase Setup ---
YOUR_BUCKET_NAME = 'tup-id-verification.firebasestorage.app'

firebase_credentials_json = os.environ.get("FIREBASE_CREDENTIALS")
cred = None
if firebase_credentials_json:
    try:
        cred = credentials.Certificate(json.loads(firebase_credentials_json))
    except json.JSONDecodeError as e:
        print(f"Error decoding FIREBASE_CREDENTIALS: {e}")
else:
    print("FIREBASE_CREDENTIALS not set. Firebase will not work.")

firebase_app = None
db = None
f_storage = None

if cred:
    try:
        firebase_app = firebase_admin.initialize_app(cred, {
            'storageBucket': YOUR_BUCKET_NAME
        })
        db = firestore.client()
        f_storage = storage
        print("✅ Firebase Admin SDK Initialized")
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")

# --- InsightFace Model Setup ---
MODEL_NAME = 'antelopev2'
_model_instance = None

def get_model():
    global _model_instance
    if _model_instance is None:
        try:
            print("🟡 Initializing InsightFace model...")
            # If you have any setup script, run it
            setup_script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'deploy_setup.py')
            if os.path.exists(setup_script_path):
                subprocess.run(["python", setup_script_path], check=True, capture_output=True)
            _model_instance = FaceAnalysis(name=MODEL_NAME)
            _model_instance.prepare(ctx_id=-1)
            print(f"✅ InsightFace model '{MODEL_NAME}' ready")
        except Exception as e:
            print(f"❌ Failed to initialize InsightFace model: {e}")
            raise RuntimeError("Model initialization failed.")
    return _model_instance

# Preload model at startup so first request is faster
with app.app_context():
    try:
        get_model()
    except RuntimeError:
        print("⚠️ Model failed to load at startup. Will attempt on first request.")

# --- Firebase Helpers ---
def download_student_image_content_from_firebase(gcs_file_path: str) -> bytes | None:
    if not f_storage:
        return None
    try:
        bucket = f_storage.bucket()
        blob = bucket.blob(gcs_file_path)
        return blob.download_as_bytes()
    except Exception as e:
        print(f"❌ Error downloading {gcs_file_path}: {e}")
        return None

def upload_faiss_file_to_firebase(local_path: str, gcs_path: str) -> bool:
    if not f_storage:
        return False
    try:
        bucket = f_storage.bucket()
        blob = bucket.blob(gcs_path)
        blob.upload_from_filename(local_path)
        return True
    except Exception as e:
        print(f"❌ Upload failed for {gcs_path}: {e}")
        return False

# --- FAISS Helpers ---
def process_image_from_bytes(image_bytes: bytes):
    model = get_model()
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    faces = model.get(img)
    if faces:
        largest_face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))
        return largest_face.embedding
    return None

def get_all_registered_data():
    if not db:
        raise Exception("Firestore DB not available")
    all_embeddings = []
    all_names = []
    all_student_info = []
    try:
        students_ref = db.collection('student_profiles')
        docs = students_ref.stream()
        for doc in docs:
            student = doc.to_dict()
            faiss_key = student.get('fullName')
            face_photos = student.get('facePhotos', {})

            if not faiss_key or not face_photos:
                continue

            student_info = {
                "accountStatus": student.get("accountStatus"),
                "birthDate": student.get("birthDate"),
                "createdAt": student.get("createdAt"),
                "email": student.get("email"),
                "fullName": student.get("fullName"),
                "guardianEmail": student.get("guardianEmail"),
                "guardianPhoneNumber": student.get("guardianPhoneNumber"),
                "isOnboarded": student.get("isOnboarded"),
                "isValidated": student.get("isValidated"),
                "phone": student.get("phone"),
                "studentNumber": student.get("studentNumber"),
                "uid": student.get("uid"),
                "validatedAt": student.get("validatedAt"),
                "validatedBy": student.get("validatedBy"),
                "validatedByRole": student.get("validatedByRole"),
                "validationResetAt": student.get("validationResetAt"),
                "validationResetBy": student.get("validationResetBy")
            }
            all_student_info.append(student_info)

            for gcs_file_url in face_photos.values():
                if gcs_file_url:
                    image_bytes = download_student_image_content_from_firebase(gcs_file_url)
                    if image_bytes:
                        embedding = process_image_from_bytes(image_bytes)
                        if embedding is not None:
                            all_embeddings.append(embedding)
                            all_names.append(faiss_key)

        return np.array(all_embeddings).astype("float32"), np.array(all_names), all_student_info
    except Exception as e:
        raise Exception(f"Failed to build index: {e}")

def build_and_upload_index():
    print("\n--- Building FAISS Index ---")
    embeddings, names, _ = get_all_registered_data()
    if embeddings.shape[0] == 0:
        print("🟡 No embeddings found.")
        return False
    faiss.normalize_L2(embeddings)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    os.makedirs("embeddings", exist_ok=True)
    index_path = "embeddings/face_index.faiss"
    names_path = "embeddings/face_names.npy"
    faiss.write_index(index, index_path)
    np.save(names_path, names)

    GCS_INDEX_PATH = "faiss_data/face_index.faiss"
    GCS_NAMES_PATH = "faiss_data/face_names.npy"
    try:
        if not upload_faiss_file_to_firebase(index_path, GCS_INDEX_PATH):
            raise Exception("Failed to upload FAISS index")
        if not upload_faiss_file_to_firebase(names_path, GCS_NAMES_PATH):
            raise Exception("Failed to upload names file")
        print("✅ FAISS Index uploaded successfully")
        return True
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return False

# --- Security Decorator ---
def shared_secret_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('X-Admin-Key')
        INDEXER_SECRET = os.getenv("INDEXER_SECRET")
        if auth_header != INDEXER_SECRET:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# --- Routes ---
@app.route("/")
def home():
    return "FAISS Builder API Running"

@app.route("/build", methods=["POST"])
@shared_secret_required
def build_index():
    if build_and_upload_index():
        return jsonify({"message": "FAISS Index built and uploaded successfully"}), 200
    else:
        return jsonify({"error": "Failed to build FAISS Index"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    print(f"Starting FAISS Builder API on port {port}")
    app.run(host="0.0.0.0", port=port)
