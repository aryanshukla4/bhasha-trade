import base64
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import Header, HTTPException, status

SECRET = os.getenv("JWT_SECRET", "development-only-secret-change-me").encode()

def issue_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role, "exp": int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).rstrip(b"=")
    signature = hmac.new(SECRET, encoded, sha256).digest()
    return f"{encoded.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"

def decode_token(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    try:
        encoded, signature = authorization[7:].split(".")
        expected = base64.urlsafe_b64encode(hmac.new(SECRET, encoded.encode(), sha256).digest()).rstrip(b"=").decode()
        claims = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if not hmac.compare_digest(signature, expected) or claims["exp"] < datetime.now(timezone.utc).timestamp(): raise ValueError
        return claims
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")

def hash_secret(value: str) -> str:
    return sha256(value.encode()).hexdigest()

def random_secret() -> str:
    return secrets.token_urlsafe(48)
