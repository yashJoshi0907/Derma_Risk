"""
database.py — Async MongoDB driver using Motor
Handles all database operations for SkinScan AI
"""

import os
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "skinscan")

# ---------------------------------------------------------------------------
# Build the client — handle SRV config errors gracefully at import time
# ---------------------------------------------------------------------------
def _build_client(uri: str) -> AsyncIOMotorClient:
    """
    Attempt to create an AsyncIOMotorClient.
    If the URI is malformed or SRV lookup fails synchronously, fall back
    to localhost so the server can still start.
    """
    try:
        return AsyncIOMotorClient(
            uri,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
            socketTimeoutMS=15000,
        )
    except Exception as e:
        print(f"[DB] WARNING: Could not parse MONGODB_URI ({e}). Falling back to localhost.")
        return AsyncIOMotorClient(
            "mongodb://localhost:27017",
            serverSelectionTimeoutMS=3000,
        )


client: AsyncIOMotorClient = _build_client(MONGODB_URI)
db = client[MONGODB_DB_NAME]

users_col = db["users"]
predictions_col = db["predictions"]


# ---------------------------------------------------------------------------
# Index creation (called from FastAPI lifespan)
# ---------------------------------------------------------------------------
async def create_indexes():
    """Create DB indexes on startup. Logs a warning if MongoDB is unreachable."""
    try:
        await client.admin.command("ping")
        await users_col.create_index("username", unique=True)
        await users_col.create_index("email", unique=True)
        await predictions_col.create_index("user_id")
        await predictions_col.create_index([("timestamp", -1)])
        await predictions_col.create_index([("user_id", 1), ("patient_name", 1)])
        print("[DB] MongoDB connected and indexes created successfully.")
    except Exception as e:
        print(f"[DB] WARNING: Could not connect to MongoDB — {e}")
        print("[DB] The server will start but database operations will fail.")
        print("[DB] Check MONGODB_URI in .env and ensure the Atlas cluster is running.")


# ---------------------------------------------------------------------------
# Helper: convert ObjectId to str in a document
# ---------------------------------------------------------------------------
def _serialize(doc: dict) -> dict:
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ---------------------------------------------------------------------------
# User operations
# ---------------------------------------------------------------------------
async def get_user_by_username(username: str) -> Optional[dict]:
    doc = await users_col.find_one({"username": username.lower()})
    return _serialize(doc)


async def get_user_by_email(email: str) -> Optional[dict]:
    doc = await users_col.find_one({"email": email.lower()})
    return _serialize(doc)


async def get_user_by_id(user_id: str) -> Optional[dict]:
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None
    doc = await users_col.find_one({"_id": oid})
    return _serialize(doc)


async def create_user(username: str, email: str, hashed_password: str) -> str:
    doc = {
        "username": username.lower(),
        "email": email.lower(),
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
    }
    result = await users_col.insert_one(doc)
    return str(result.inserted_id)


# ---------------------------------------------------------------------------
# Prediction operations
# ---------------------------------------------------------------------------
async def save_prediction(prediction_dict: dict) -> str:
    if "patient_name" not in prediction_dict:
        raise ValueError("prediction_dict must include non-null patient_name key (use empty string if unknown)")
    result = await predictions_col.insert_one(prediction_dict)
    return str(result.inserted_id)


async def get_predictions_by_user(
    user_id: str, limit: int = 20, skip: int = 0
) -> list:
    cursor = (
        predictions_col.find({"user_id": user_id})
        .sort("timestamp", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = []
    async for doc in cursor:
        docs.append(_serialize(doc))
    return docs


async def get_prediction_by_id(
    prediction_id: str, user_id: str
) -> Optional[dict]:
    try:
        oid = ObjectId(prediction_id)
    except Exception:
        return None
    doc = await predictions_col.find_one({"_id": oid, "user_id": user_id})
    return _serialize(doc)


async def get_or_create_google_user(email: str, name: str) -> dict:
    """
    Find a user by email. If not found, create one with auth_provider='google'.
    Returns the serialized user document.
    """
    email_lower = email.lower()
    doc = await users_col.find_one({"email": email_lower})
    if doc:
        return _serialize(doc)

    # Create a username from the email prefix, ensuring uniqueness
    base_username = email_lower.split("@")[0].replace(".", "_").replace("-", "_")[:25]
    # Only keep valid characters
    import re
    base_username = re.sub(r"[^a-z0-9_]", "", base_username)
    if len(base_username) < 3:
        base_username = "user_" + base_username

    username = base_username
    counter = 1
    while await users_col.find_one({"username": username}):
        username = f"{base_username}_{counter}"
        counter += 1

    new_user = {
        "username": username,
        "email": email_lower,
        "display_name": name or username,
        "hashed_password": None,
        "auth_provider": "google",
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
    }
    await users_col.insert_one(new_user)
    return _serialize(await users_col.find_one({"email": email_lower}))


async def delete_prediction(prediction_id: str, user_id: str) -> bool:
    try:
        oid = ObjectId(prediction_id)
    except Exception:
        return False
    result = await predictions_col.delete_one({"_id": oid, "user_id": user_id})
    return result.deleted_count > 0
