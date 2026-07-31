from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from PIL import Image
import pickle
import io
import base64
from pathlib import Path
import logging
from typing import List, Dict, Any
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import random
from dotenv import load_dotenv
import onnxruntime as ort

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="GrazeScale AI - Muzzle Recognition API",
    description="Production API for livestock identification using muzzle biometrics by AVparkhe (ONNX Runtime)",
    version="2.0.0"
)

# Add CORS middleware with dynamic environment support
allowed_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# PostgreSQL Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'grazescale_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

# Global variables
recognizer = None
MODEL_PATH = os.getenv("MODEL_PATH", "muzzle_recognition_model.pkl")
ONNX_MODEL_PATH = os.getenv("ONNX_MODEL_PATH", os.path.join(os.path.dirname(__file__), "resnet50_features.onnx"))

def get_db_connection():
    """Get PostgreSQL database connection (supports Render DATABASE_URL or discrete config)"""
    try:
        if DATABASE_URL:
            conn = psycopg2.connect(DATABASE_URL)
        else:
            conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

def generate_cattle_id():
    """Generate 12-digit cattle ID similar to Aadhar"""
    cattle_id = ''.join([str(random.randint(0, 9)) for _ in range(12)])
    return cattle_id

def is_cattle_id_exists(cattle_id: str) -> bool:
    """Check if cattle ID already exists in database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM cattle WHERE cattle_id = %s', (cattle_id,))
    count = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return count > 0

def get_unique_cattle_id() -> str:
    """Generate unique 12-digit cattle ID"""
    while True:
        cattle_id = generate_cattle_id()
        if not is_cattle_id_exists(cattle_id):
            return cattle_id

def calc_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity between two 1D feature vectors using pure NumPy"""
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(vec1, vec2) / (norm1 * norm2))

def preprocess_image_for_onnx(image: Image.Image) -> np.ndarray:
    """Preprocess PIL Image to (1, 3, 224, 224) float32 numpy array with ImageNet normalization"""
    img = image.convert('RGB').resize((224, 224))
    img_np = np.array(img, dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    img_np = (img_np - mean) / std
    img_np = img_np.transpose(2, 0, 1)  # Convert HWC to CHW
    return np.expand_dims(img_np, axis=0) # Add batch dim: (1, 3, 224, 224)

class ONNXFeatureExtractor:
    """Lightweight feature extractor using ONNX Runtime (low memory footprint)"""
    def __init__(self, model_path: str = ONNX_MODEL_PATH):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"ONNX model file not found at {model_path}")
        
        # Configure ONNX Runtime for low-memory single-thread CPU execution
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        
        self.session = ort.InferenceSession(model_path, opts, providers=['CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name
        logger.info(f"ONNX Feature Extractor initialized successfully with model: {model_path}")

    def extract_features(self, image: Image.Image) -> np.ndarray:
        tensor = preprocess_image_for_onnx(image)
        outputs = self.session.run([self.output_name], {self.input_name: tensor})
        return outputs[0].flatten()

class CattleRecognitionAPI:
    """Main recognition class for API using ONNX Runtime"""
    def __init__(self, model_path: str = MODEL_PATH, onnx_path: str = ONNX_MODEL_PATH):
        self.model_path = model_path
        self.animal_database = {}
        
        # Initialize ONNX feature extractor
        self.feature_extractor = ONNXFeatureExtractor(onnx_path)
        
        # Load legacy model structure if exists
        if os.path.exists(model_path):
            self.load_model(model_path)
        
        # Initialize database
        self.init_database()
        
        # Load existing cattle into memory
        self.load_existing_cattle()
    
    def init_database(self):
        """Initialize PostgreSQL database tables"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cattle (
                id SERIAL PRIMARY KEY,
                cattle_id VARCHAR(12) UNIQUE NOT NULL,
                owner_name VARCHAR(255),
                owner_contact VARCHAR(50),
                registration_date TIMESTAMP,
                breed VARCHAR(100),
                age INTEGER,
                features BYTEA,
                image_count INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active'
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS verification_logs (
                id SERIAL PRIMARY KEY,
                query_cattle_id VARCHAR(12),
                matched_cattle_id VARCHAR(12),
                confidence REAL,
                verification_date TIMESTAMP,
                decision VARCHAR(50),
                image_data BYTEA
            )
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Database tables initialized successfully")
    
    def load_existing_cattle(self):
        """Load existing cattle from database into memory"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute('''
                SELECT cattle_id, owner_name, owner_contact, breed, age, features 
                FROM cattle WHERE status = 'active'
            ''')
            
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            
            for row in results:
                cattle_id = row['cattle_id']
                features = pickle.loads(bytes(row['features'])) if row['features'] else None
                
                if features is not None:
                    self.animal_database[cattle_id] = {
                        'avg_features': features,
                        'image_paths': [],
                        'metadata': {
                            'cattle_id': cattle_id,
                            'owner_name': row['owner_name'],
                            'owner_contact': row['owner_contact'],
                            'breed': row['breed'],
                            'age': row['age']
                        }
                    }
            
            logger.info(f"Loaded {len(self.animal_database)} cattle from database")
            
        except Exception as e:
            logger.error(f"Error loading existing cattle: {e}")
    
    def load_model(self, model_path: str):
        """Load trained model structure"""
        try:
            with open(model_path, 'rb') as f:
                save_data = pickle.load(f)
            logger.info("Model structure loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
    
    def extract_features_from_image(self, image: Image.Image):
        """Extract features from PIL Image using ONNX"""
        try:
            return self.feature_extractor.extract_features(image)
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return None
    
    def register_cattle(self, cattle_data: Dict, image: Image.Image) -> Dict:
        """Register new cattle in database"""
        try:
            # Generate unique cattle ID if not provided
            if 'cattle_id' not in cattle_data or not cattle_data['cattle_id']:
                cattle_data['cattle_id'] = get_unique_cattle_id()
            
            # Extract features
            features = self.extract_features_from_image(image)
            if features is None:
                return {"success": False, "error": "Failed to extract features"}
            
            # Check for duplicates
            duplicate_check = self.identify_cattle(image, confidence_threshold=0.90)
            if duplicate_check.get('success', False) and duplicate_check['decision'] == 'MATCH_CONFIDENT':
                return {
                    "success": False, 
                    "error": "Cattle already registered",
                    "existing_cattle_id": duplicate_check['top_match'],
                    "confidence": duplicate_check['confidence']
                }
            
            # Store in database
            conn = get_db_connection()
            cursor = conn.cursor()
            
            features_blob = psycopg2.Binary(pickle.dumps(features))
            
            cursor.execute('''
                INSERT INTO cattle 
                (cattle_id, owner_name, owner_contact, registration_date, breed, age, features, image_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                cattle_data['cattle_id'],
                cattle_data.get('owner_name', ''),
                cattle_data.get('owner_contact', ''),
                datetime.now(),
                cattle_data.get('breed', ''),
                cattle_data.get('age', 0),
                features_blob,
                1
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            # Update in-memory database
            self.animal_database[cattle_data['cattle_id']] = {
                'avg_features': features,
                'image_paths': [],
                'metadata': cattle_data
            }
            
            logger.info(f"Cattle {cattle_data['cattle_id']} registered successfully")
            return {"success": True, "cattle_id": cattle_data['cattle_id']}
            
        except Exception as e:
            logger.error(f"Error registering cattle: {e}")
            return {"success": False, "error": str(e)}
    
    def identify_cattle(self, image: Image.Image, confidence_threshold: float = 0.85) -> Dict:
        """Identify cattle from image using ONNX runtime features"""
        try:
            # Extract features
            query_features = self.extract_features_from_image(image)
            if query_features is None:
                return {"success": False, "error": "Failed to extract features"}
            
            if not self.animal_database:
                return {"success": False, "error": "No cattle registered in database"}
            
            # Compare with database using pure NumPy cosine similarity
            similarities = {}
            for cattle_id, data in self.animal_database.items():
                if 'avg_features' in data:
                    similarity = calc_cosine_similarity(
                        query_features,
                        data['avg_features']
                    )
                    similarities[cattle_id] = similarity
            
            # Sort by similarity
            sorted_matches = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
            
            # Prepare results
            results = []
            for i, (cattle_id, similarity) in enumerate(sorted_matches[:5]):
                results.append({
                    'rank': i + 1,
                    'cattle_id': cattle_id,
                    'similarity': similarity,
                    'confidence': similarity * 100
                })
            
            # Smart decision making
            top_confidence = results[0]['confidence'] / 100
            similarity_gap = 0
            if len(results) > 1:
                similarity_gap = (results[0]['confidence'] - results[1]['confidence']) / 100
            
            # Decision logic
            if top_confidence >= confidence_threshold:
                if similarity_gap >= 0.05:
                    decision = 'MATCH_CONFIDENT'
                    message = f'HIGH CONFIDENCE: This is cattle {results[0]["cattle_id"]}'
                else:
                    decision = 'MATCH_UNCERTAIN'
                    message = f'UNCERTAIN: Could be cattle {results[0]["cattle_id"]}'
            else:
                if top_confidence >= 0.70:
                    decision = 'SIMILAR_NEW'
                    message = 'LIKELY NEW CATTLE: Similar but probably different'
                else:
                    decision = 'NEW_UNIQUE'
                    message = 'NEW UNIQUE CATTLE: Very different muzzle pattern'
            
            return {
                'success': True,
                'decision': decision,
                'message': message,
                'top_match': results[0]['cattle_id'],
                'confidence': top_confidence,
                'similarity_gap': similarity_gap,
                'all_results': results
            }
            
        except Exception as e:
            logger.error(f"Error identifying cattle: {e}")
            return {"success": False, "error": str(e)}
    
    def get_cattle_info(self, cattle_id: str) -> Dict:
        """Get detailed information about specific cattle"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute('''
                SELECT id, cattle_id, owner_name, owner_contact, 
                       registration_date, breed, age, image_count, status
                FROM cattle WHERE cattle_id = %s
            ''', (cattle_id,))
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if result:
                cattle_info = dict(result)
                if cattle_info.get('registration_date'):
                    cattle_info['registration_date'] = cattle_info['registration_date'].isoformat()
                return {"success": True, "cattle_info": cattle_info}
            else:
                return {"success": False, "error": "Cattle not found"}
                
        except Exception as e:
            logger.error(f"Error getting cattle info: {e}")
            return {"success": False, "error": str(e)}

# Initialize global recognizer
@app.on_event("startup")
async def startup_event():
    global recognizer
    recognizer = CattleRecognitionAPI()
    logger.info("Cattle Recognition API started successfully (ONNX mode)")

# API Endpoints
# -------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "Cattle Muzzle Recognition API", "status": "active", "engine": "ONNX Runtime"}

@app.get("/health")
async def health_check():
    cattle_count = len(recognizer.animal_database) if recognizer else 0
    return {
        "status": "healthy",
        "registered_cattle": cattle_count,
        "model_loaded": recognizer is not None,
        "database": "PostgreSQL",
        "engine": "ONNX Runtime"
    }

@app.post("/register")
async def register_cattle(
    owner_name: str = Form(...),
    owner_contact: str = Form(...),
    breed: str = Form(...),
    age: int = Form(...),
    muzzle_image: UploadFile = File(...) 
):
    """Register new cattle with muzzle image"""
    
    if not muzzle_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        image_data = await muzzle_image.read()
        image = Image.open(io.BytesIO(image_data))
        
        cattle_data = {
            "owner_name": owner_name,
            "owner_contact": owner_contact,
            "breed": breed,
            "age": age,
        }
        
        result = recognizer.register_cattle(cattle_data, image)
        
        if result.get("success"):
            return JSONResponse(content=result, status_code=201)
        else:
            return JSONResponse(content=result, status_code=400)

    except Exception as e:
        logger.error(f"Error in register endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify")
async def verify_cattle(
    muzzle_image: UploadFile = File(...)
):
    """Verify/identify cattle from muzzle image"""
    
    if not muzzle_image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        image_data = await muzzle_image.read()
        image = Image.open(io.BytesIO(image_data))
        
        result = recognizer.identify_cattle(image)

        if 'confidence' in result:
            result['confidence'] = float(result['confidence'])
        if 'similarity_gap' in result:
            result['similarity_gap'] = float(result['similarity_gap'])
        if 'all_results' in result and isinstance(result['all_results'], list):
            for r in result['all_results']:
                if 'similarity' in r:
                    r['similarity'] = float(r['similarity'])
                if 'confidence' in r:
                    r['confidence'] = float(r['confidence'])

        if result.get('success', False) and result.get('decision') in ['MATCH_CONFIDENT', 'MATCH_UNCERTAIN']:
            cattle_info = recognizer.get_cattle_info(result['top_match'])
            if cattle_info.get('success'):
                result['matched_cattle'] = cattle_info['cattle_info']

        if result.get('success', False):
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO verification_logs 
                (matched_cattle_id, confidence, verification_date, decision, image_data)
                VALUES (%s, %s, %s, %s, %s)
            ''', (
                result.get('top_match', ''),
                result.get('confidence', 0),
                datetime.now(),
                result.get('decision', ''),
                psycopg2.Binary(image_data)
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
        
        return JSONResponse(content={
            "is_matched": result.get('decision', 'NEW_UNIQUE') in ['MATCH_CONFIDENT', 'MATCH_UNCERTAIN'],
            "confidence": result.get('confidence', 0.0),
            "matched_cattle": result.get('matched_cattle', None)
        })
        
    except Exception as e:
        logger.error(f"Error in verify endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cattle/{cattle_id}")
async def get_cattle_details(cattle_id: str):
    """Get detailed information about specific cattle"""
    result = recognizer.get_cattle_info(cattle_id)
    
    if result['success']:
        return JSONResponse(content=result)
    else:
        return JSONResponse(content=result, status_code=404)

@app.get("/cattle")
async def list_all_cattle():
    """Get list of all registered cattle"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            SELECT cattle_id, owner_name, breed, registration_date, status, owner_contact, age 
            FROM cattle WHERE status = 'active'
            ORDER BY registration_date DESC
        ''')
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        cattle_list = []
        for row in results:
            cattle_dict = dict(row)
            if cattle_dict.get('registration_date'):
                cattle_dict['registration_date'] = cattle_dict['registration_date'].isoformat()
            cattle_list.append(cattle_dict)
        
        return JSONResponse(content=cattle_list)
        
    except Exception as e:
        logger.error(f"Error listing cattle: {e}")
        return JSONResponse(content=[], status_code=500)

@app.get("/logs")
async def get_verification_logs(limit: int = 50):
    """Get recent verification logs"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            SELECT matched_cattle_id, confidence, verification_date, decision 
            FROM verification_logs 
            ORDER BY verification_date DESC 
            LIMIT %s
        ''', (limit,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        logs = []
        for row in results:
            log_dict = dict(row)
            if log_dict.get('verification_date'):
                log_dict['verification_date'] = log_dict['verification_date'].isoformat()
            logs.append(log_dict)
        
        return JSONResponse(content=logs)
        
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        return JSONResponse(content=[], status_code=500)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)