import pytest
from app.core.security import (
    get_password_hash, verify_password, create_access_token, decode_access_token,
    encrypt_text, decrypt_text
)

def test_password_hashing():
    password = "secretpassword123"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_jwt_tokens():
    subject = "123"
    token = create_access_token(subject)
    
    decoded = decode_access_token(token)
    assert decoded == subject

def test_jwt_token_invalid():
    assert decode_access_token("invalid.token.here") is None

def test_aes_encryption_decryption():
    plain_text = "Highly sensitive student journal text: Allen test scores were disappointing."
    encrypted = encrypt_text(plain_text)
    
    assert encrypted != plain_text
    # Output is hex format
    assert len(encrypted) > 24  # Nonce (24 hex chars) + ciphertext
    
    decrypted = decrypt_text(encrypted)
    assert decrypted == plain_text

def test_aes_decryption_failure():
    # Attempting to decrypt tampered/malformed data
    with pytest.raises(ValueError, match="Decryption failed"):
        decrypt_text("aabbccddeeff11223344")
