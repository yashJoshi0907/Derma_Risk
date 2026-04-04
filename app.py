"""
app.py — SkinScan AI FastAPI backend
Includes auth, prediction, history, chat routes.
"""

import io
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional

import numpy as np
from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Project .env must win over a stale GOOGLE_CLIENT_ID in the OS/shell (wrong audience errors).
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# ── Import internal modules ────────────────────────────────────────────────
from auth import (
    UserRegister,
    UserResponse,
    Token,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from database import (
    create_indexes,
    create_user,
    delete_prediction,
    get_or_create_google_user,
    get_prediction_by_id,
    get_predictions_by_user,
    get_user_by_email,
    get_user_by_username,
    save_prediction,
)
from predict import predict as run_predict

# ── Class information ──────────────────────────────────────────────────────
CLASS_INFO = {
    "nv":    {"full_name": "Melanocytic Nevi",              "risk": "low"},
    "mel":   {"full_name": "Melanoma",                      "risk": "high"},
    "bcc":   {"full_name": "Basal Cell Carcinoma",          "risk": "high"},
    "akiec": {"full_name": "Actinic Keratosis/Bowen's",     "risk": "medium"},
    "bkl":   {"full_name": "Benign Keratosis",              "risk": "low"},
    "df":    {"full_name": "Dermatofibroma",                "risk": "low"},
    "vasc":  {"full_name": "Vascular Lesion",               "risk": "low"},
}


# ── Helpers ────────────────────────────────────────────────────────────────
def encode_image(img: np.ndarray, quality: int = 88) -> str:
    """Encode numpy RGB uint8 → base64 JPEG string."""
    import base64
    pil = Image.fromarray(img.astype(np.uint8))
    buf = io.BytesIO()
    pil.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def resize_for_frontend(img: np.ndarray, target_width: int = 300) -> np.ndarray:
    """Resize maintaining aspect ratio."""
    import cv2
    h, w = img.shape[:2]
    if w == 0:
        return img
    scale = target_width / w
    new_h = int(h * scale)
    return cv2.resize(img, (target_width, new_h), interpolation=cv2.INTER_AREA)


# ── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_indexes()
    print("[App] MongoDB indexes created.")
    yield
    # Shutdown
    print("[App] Shutting down.")


# ── FastAPI app ────────────────────────────────────────────────────────────
app = FastAPI(
    title="SkinScan AI",
    description="Skin lesion AI diagnostic tool with explainability",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Explicit allowlist: wildcard ("*") + allow_credentials=True is rejected by
    # browsers (CORS spec). List every origin that sends credentialed requests.
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:5174",  
        "http://127.0.0.1:5174",
        "http://localhost:8001",   # same-origin (production build served by FastAPI)
        "http://127.0.0.1:8001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8001",
        "http://localhost:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════════════════════════════════

@app.post("/auth/register", summary="Register a new user")
async def register(user_data: UserRegister):
    # Check username uniqueness
    existing = await get_user_by_username(user_data.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    # Check email uniqueness
    existing_email = await get_user_by_email(user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed = hash_password(user_data.password)
    await create_user(user_data.username, user_data.email, hashed)

    return {"message": "Registration successful", "username": user_data.username}


@app.post("/auth/login", response_model=Token, summary="Login and get JWT")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user_by_username(form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user["username"]})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserResponse, summary="Get current user info")
async def me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        username=current_user["username"],
        email=current_user["email"],
        created_at=current_user["created_at"],
    )


# ══════════════════════════════════════════════════════════════════
# GOOGLE OAUTH
# ══════════════════════════════════════════════════════════════════

class GoogleAuthRequest(BaseModel):
    credential: str


@app.get("/auth/google-client-id", summary="Get Google OAuth Client ID")
async def google_client_id():
    return {"client_id": GOOGLE_CLIENT_ID}


@app.post("/auth/google", summary="Authenticate via Google OAuth")
async def google_auth(payload: GoogleAuthRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on this server.",
        )

    import requests as _requests
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    print(f"[Google OAuth] Received credential (first 20 chars): {payload.credential[:20]}...")
    print(f"[Google OAuth] Verifying with GOOGLE_CLIENT_ID: {GOOGLE_CLIENT_ID}")

    id_info = None
    verification_error = None

    # ── Path 1: Verify as a Google ID token (standard GIS One-Tap / button flow) ──
    try:
        id_info = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
        print(f"[Google OAuth] ID token verified OK. email={id_info.get('email')}")
    except Exception as e:
        verification_error = e
        print(f"[Google OAuth] ID token verification failed: {e}")

    # ── Path 2: Fallback — treat credential as an OAuth2 access token ──
    if id_info is None:
        try:
            print("[Google OAuth] Falling back to userinfo endpoint lookup...")
            resp = _requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.credential}"},
                timeout=5,
            )
            if resp.status_code != 200:
                raise ValueError(
                    f"Google userinfo API returned {resp.status_code}: {resp.text}"
                )
            id_info = resp.json()
            print(f"[Google OAuth] Userinfo OK. email={id_info.get('email')}")
        except Exception as fallback_err:
            print(f"[Google OAuth] Fallback also failed: {fallback_err}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google token verification failed: {verification_error}",
            )

    email = id_info.get("email")
    name  = id_info.get("name", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account has no email address.",
        )

    # ── Find or create the user in MongoDB ──
    user = await get_or_create_google_user(email, name)
    print(f"[Google OAuth] User resolved: username={user['username']}")

    # ── Issue our own JWT ──
    token = create_access_token({"sub": user["username"]})

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"],
        "email": user["email"],
    }


# ══════════════════════════════════════════════════════════════════
# PREDICTION ROUTE
# ══════════════════════════════════════════════════════════════════

@app.post("/predict", summary="Run skin lesion classification")
async def predict_endpoint(
    file: UploadFile = File(...),
    age: Optional[float] = Form(None),
    sex: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    patient_name: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    image_bytes = await file.read()

    # Stored only (search / records); not passed to the model. Always a string (never omitted in DB).
    patient_name_stored = (patient_name or "").strip()

    result = run_predict(image_bytes, age=age, sex=sex, location=location)

    label      = result["label"]
    confidence = result["confidence"]
    mode       = result["mode"]
    meta_used  = result.get("metadata_used", {})

    info       = CLASS_INFO.get(label, {"full_name": label, "risk": "unknown"})
    full_name  = info["full_name"]
    risk_level = info["risk"]

    # Encode images
    gradcam_resized  = resize_for_frontend(result["gradcam"],   target_width=600)
    lime_resized     = resize_for_frontend(result["lime"],      target_width=300)

    gradcam_b64   = encode_image(gradcam_resized)
    lime_b64      = encode_image(lime_resized)
    original_b64  = encode_image(result["original_image"])

    now = datetime.now(timezone.utc)

    prediction_doc = {
        "user_id":            current_user["_id"],
        "username":           current_user["username"],
        "timestamp":          now,
        "patient_name":       patient_name_stored,
        "label":              label,
        "full_name":          full_name,
        "confidence":         confidence,
        "risk_level":         risk_level,
        "mode":               mode,
        "metadata": {
            "age":      meta_used.get("age", age if age is not None else 55.0),
            "sex":      meta_used.get("sex", sex or "unknown"),
            "location": meta_used.get("location", location or "unknown"),
        },
        "gradcam_b64":        gradcam_b64,
        "lime_b64":           lime_b64,
        "original_image_b64": original_b64,
    }

    inserted_id = await save_prediction(prediction_doc)

    return {
        "status":         "success",
        "prediction_id":  str(inserted_id),
        "patient_name":   patient_name_stored,
        "label":          label,
        "full_name":      full_name,
        "confidence":     confidence,
        "risk_level":     risk_level,
        "mode":           mode,
        "metadata_used":  meta_used,
        "gradcam":        gradcam_b64,
        "lime":           lime_b64,
        "original_image": original_b64,
        "timestamp":      now.isoformat(),
    }


# ══════════════════════════════════════════════════════════════════
# HISTORY ROUTES
# ══════════════════════════════════════════════════════════════════

@app.get("/history", summary="Get prediction history for current user")
async def history(
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user),
):
    limit = min(limit, 50)
    user_id = current_user["_id"]

    predictions = await get_predictions_by_user(user_id, limit=limit, skip=skip)

    result_list = []
    for p in predictions:
        result_list.append({
            "prediction_id": p["_id"],
            "timestamp":     p["timestamp"].isoformat() if isinstance(p["timestamp"], datetime) else p["timestamp"],
            "patient_name":  p.get("patient_name", ""),
            "label":         p.get("label", ""),
            "full_name":     p.get("full_name", ""),
            "confidence":    p.get("confidence", 0.0),
            "risk_level":    p.get("risk_level", "unknown"),
            "mode":          p.get("mode", ""),
            "metadata":      p.get("metadata", {}),
            "original_image": p.get("original_image_b64", ""),
        })

    return {
        "predictions": result_list,
        "total":       len(result_list),
        "limit":       limit,
        "skip":        skip,
    }


@app.get("/history/{prediction_id}", summary="Get single prediction detail")
async def history_detail(
    prediction_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["_id"]
    prediction = await get_prediction_by_id(prediction_id, user_id)

    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found",
        )

    ts = prediction.get("timestamp")
    ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts)

    return {
        "prediction_id":  prediction["_id"],
        "timestamp":      ts_str,
        "patient_name":   prediction.get("patient_name", ""),
        "label":          prediction.get("label", ""),
        "full_name":      prediction.get("full_name", ""),
        "confidence":     prediction.get("confidence", 0.0),
        "risk_level":     prediction.get("risk_level", "unknown"),
        "mode":           prediction.get("mode", ""),
        "metadata":       prediction.get("metadata", {}),
        "gradcam":        prediction.get("gradcam_b64", ""),
        "lime":           prediction.get("lime_b64", ""),
        "original_image": prediction.get("original_image_b64", ""),
    }


@app.delete("/history/{prediction_id}", summary="Delete a prediction")
async def delete_prediction_route(
    prediction_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["_id"]
    deleted = await delete_prediction(prediction_id, user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found or access denied",
        )

    return {"message": "Prediction deleted successfully"}


# ══════════════════════════════════════════════════════════════════
# CHAT ROUTE
# ══════════════════════════════════════════════════════════════════

class HistoryEntry(BaseModel):
    """A single turn in the conversation history."""
    role: str          # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[HistoryEntry] = []


SYSTEM_INSTRUCTION = (
    "You are a skin cancer and dermatology education assistant embedded "
    "in a skin lesion AI diagnostic tool called SkinScan AI. "
    "Help users understand skin lesion types "
    "(nv=Melanocytic Nevi, mel=Melanoma, bcc=Basal Cell Carcinoma, "
    "akiec=Actinic Keratosis, bkl=Benign Keratosis, df=Dermatofibroma, "
    "vasc=Vascular Lesion), risk factors, ABCDE criteria, when to see a doctor, "
    "and how to interpret AI prediction results including Grad-CAM and LIME explanations. "
    "You do NOT provide medical diagnoses or treatment plans. "
    "Always recommend consulting a certified dermatologist. "
    "Decline off-topic questions politely and redirect to skin health."
)


# Preferred Gemini models (runtime filters to only those available to the API key).
_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]


@app.post("/chat", summary="Chat with dermatology AI assistant")
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    print(f"[Chat] user={current_user['username']} | message='{request.message[:60]}...' | history_len={len(request.history)}")

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API key is not configured on this server.",
        )

    from google import genai
    from google.genai import types
    from google.genai.errors import ClientError

    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

    # Build Gemini-compatible conversation history.
    # Filter out any entry where role is not user/model (defensive).
    VALID_ROLES = {"user", "model"}
    chat_history = []
    for entry in request.history:
        role = entry.role if entry.role in VALID_ROLES else "user"
        text = entry.content.strip()
        if text:
            chat_history.append(
                types.Content(role=role, parts=[types.Part(text=text)])
            )

    # Discover models actually available to this API key to avoid NOT_FOUND errors.
    model_candidates = list(_GEMINI_MODELS)
    try:
        available_names = set()
        for m in gemini_client.models.list():
            name = getattr(m, "name", "")
            if name.startswith("models/"):
                available_names.add(name.split("/", 1)[1])
        filtered = [m for m in _GEMINI_MODELS if m in available_names]
        if filtered:
            model_candidates = filtered
        print(f"[Chat] Available Gemini models: {filtered or _GEMINI_MODELS}")
    except Exception as list_err:
        print(f"[Chat] Could not list Gemini models (using fallbacks): {list_err}")

    last_error = None
    for model_name in model_candidates:
        print(f"[Chat] Trying model: {model_name}")
        try:
            chat_session = gemini_client.chats.create(
                model=model_name,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    max_output_tokens=1024,
                ),
                history=chat_history,
            )
            response = chat_session.send_message(request.message)
            response_text = response.text
            print(f"[Chat] Response from {model_name}: {response_text[:80]}...")

            # Return updated history so the frontend can keep it in sync
            updated_history = [e.model_dump() for e in request.history] + [
                {"role": "user",  "content": request.message},
                {"role": "model", "content": response_text},
            ]
            return {"response": response_text, "history": updated_history}

        except ClientError as ce:
            last_error = ce
            err_str = str(ce)
            print(f"[Chat] ClientError from {model_name}: {err_str[:120]}")

            # Quota exhausted or model unavailable — try next
            if any(k in err_str for k in ("429", "RESOURCE_EXHAUSTED", "400", "INVALID_ARGUMENT", "NOT_FOUND")):
                continue

            # Auth / key errors — no point retrying any model
            if any(k in err_str.upper() for k in ("401", "403", "API_KEY", "PERMISSION_DENIED")):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Gemini API key is invalid or lacks permission. Contact support.",
                )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gemini API error: {err_str}",
            )

        except Exception as e:
            last_error = e
            print(f"[Chat] Unexpected error from {model_name}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected chat error: {str(e)}",
            )

    # Every model attempt failed (quota / model availability)
    print(f"[Chat] All models exhausted. Last error: {last_error}")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "All AI models are currently unavailable (quota exceeded or model not accessible). "
            "Please try again in a moment."
        ),
    )


# ══════════════════════════════════════════════════════════════════
# STATIC + PAGE ROUTES (must come LAST before StaticFiles mount)
# ══════════════════════════════════════════════════════════════════

@app.get("/health", summary="Health check")
async def health():
    return {"message": "SkinScan AI Running"}


# ── Frontend serving ──────────────────────────────────────────────────────────
# Development  → frontend runs separately on http://localhost:5173 (npm run dev)
# Production   → build the React app first (`npm run build`) and this will serve
#                frontend/dist/index.html for every page route.

def _serve_react(path: str = "index.html"):
    """Return the built React index.html if dist exists, else a dev-mode hint."""
    dist_index = os.path.join(FRONTEND_DIST, path)
    if os.path.isfile(dist_index):
        return FileResponse(dist_index)
    return JSONResponse(
        status_code=200,
        content={
            "message": "React frontend not built yet.",
            "hint": "Run `cd frontend && npm run build` to produce frontend/dist, "
                    "or start the dev server with `npm run dev` on port 5173.",
        },
    )


@app.get("/login", include_in_schema=False)
async def login_page():
    return _serve_react()


@app.get("/register", include_in_schema=False)
async def register_page():
    return _serve_react()


@app.get("/", include_in_schema=False)
async def main_page():
    return _serve_react()


# Catch-all for React Router client-side routes (e.g. /dashboard, /dashboard/new)
@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    # Don't intercept API routes
    if full_path.startswith(("auth/", "predict", "history", "chat", "health")):
        raise HTTPException(status_code=404, detail="Not found")
    return _serve_react()


# Mount built React static assets AFTER all route definitions
# (assets/ folder with hashed JS/CSS only exists after `npm run build`)
if os.path.isdir(FRONTEND_DIST):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")),
        name="react-assets",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
