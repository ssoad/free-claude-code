"""API routes for managing API Keys."""

import hashlib
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from api.db import get_db
from api.dependencies import get_current_user
from api.user_models import ApiKey, User

router = APIRouter(prefix="/api/keys", tags=["API Keys"])


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ApiKeyCreate(BaseModel):
    name: str


class ApiKeyCreatedResponse(ApiKeyResponse):
    key: str  # Only returned once upon creation


@router.get("", response_model=list[ApiKeyResponse])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all API keys for the current user."""
    keys = db.query(ApiKey).filter(ApiKey.user_id == current_user.id).order_by(ApiKey.created_at.desc()).all()
    return keys


@router.post("", response_model=ApiKeyCreatedResponse)
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new API key."""
    # Generate a random 32-byte secure token, convert to hex
    raw_token = secrets.token_hex(32)
    full_key = f"sk-fcc-{raw_token}"
    
    # Store hashed version
    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()
    
    # Prefix to show in UI
    prefix = f"sk-fcc-...{raw_token[-4:]}"
    
    new_key = ApiKey(
        user_id=current_user.id,
        name=payload.name,
        key_hash=key_hash,
        prefix=prefix,
        is_active=True
    )
    
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    # Return the full key only once
    return ApiKeyCreatedResponse(
        id=new_key.id,
        name=new_key.name,
        prefix=new_key.prefix,
        is_active=new_key.is_active,
        created_at=new_key.created_at,
        last_used_at=new_key.last_used_at,
        key=full_key,
    )


@router.delete("/{key_id}")
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke (delete) an API key."""
    db_key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.user_id == current_user.id).first()
    if not db_key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    db.delete(db_key)
    db.commit()
    
    return {"status": "success", "message": "API Key revoked"}
