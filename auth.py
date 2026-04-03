"""
auth.py — JWT-based authentication for SkinScan AI
Uses passlib (bcrypt) for password hashing and python-jose for JWT
"""

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, field_validator

from database import get_user_by_username

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# bcrypt only uses the first 72 UTF-8 bytes; newer bcrypt raises if longer.
_BCRYPT_MAX_BYTES = 72


def _bcrypt_plain(plain: str) -> str:
    b = plain.encode("utf-8")
    if len(b) <= _BCRYPT_MAX_BYTES:
        return plain
    return b[:_BCRYPT_MAX_BYTES].decode("utf-8", errors="ignore")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(_bcrypt_plain(plain_password))


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(_bcrypt_plain(plain), hashed)


# ---------------------------------------------------------------------------
# JWT token utilities
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: Optional[str] = payload.get("sub")
    if username is None:
        raise credentials_exception

    user = await get_user_by_username(username)
    if user is None:
        raise credentials_exception

    return user


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        v = v.lower()
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be 3-30 characters long")
        if not re.match(r"^[a-z0-9_]+$", v):
            raise ValueError("Username may only contain letters, digits, and underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

    @field_validator("email")
    @classmethod
    def validate_email_lower(cls, v):
        return v.lower()


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
