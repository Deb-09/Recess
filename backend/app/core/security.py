from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt, JWTError
import bcrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash of a plain text password."""
    # Truncate password to 72 bytes if necessary to prevent bcrypt limits errors
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT access token for a subject (user ID)."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    """Decode a JWT access token and return the subject (user ID)."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

# --- Journal AES-256-GCM Encryption / Decryption ---

def encrypt_text(plain_text: str) -> str:
    """
    Encrypt a plain text string using AES-256-GCM.
    Returns a hex-encoded string containing: nonce (12 bytes) + ciphertext.
    """
    if not plain_text:
        return ""
    
    key = settings.encryption_key
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 12-byte nonce for GCM
    
    plaintext_bytes = plain_text.encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, plaintext_bytes, None)
    
    # Store combined nonce and ciphertext as hex
    return (nonce + ciphertext).hex()

def decrypt_text(encrypted_hex: str) -> str:
    """
    Decrypt a hex-encoded string (nonce + ciphertext) using AES-256-GCM.
    """
    if not encrypted_hex:
        return ""
    
    try:
        key = settings.encryption_key
        aesgcm = AESGCM(key)
        
        data = bytes.fromhex(encrypted_hex)
        if len(data) < 12:
            raise ValueError("Encrypted data is truncated or invalid.")
        
        nonce = data[:12]
        ciphertext = data[12:]
        
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode("utf-8")
    except Exception as e:
        # Prevent leaking cryptographic errors
        raise ValueError("Decryption failed. Data might be corrupted or key mismatch.") from e
