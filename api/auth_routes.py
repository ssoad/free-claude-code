"""Authentication APIs for public user registration and login."""

import json

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.auth import create_access_token, get_password_hash, verify_password
from api.db import get_db
from api.user_models import User

from .dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


@router.post("/signup", response_model=TokenResponse)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new public user."""
    # Check if user exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    hashed_password = get_password_hash(user_data.password)
    
    # If this is the first user to register, make them an admin automatically
    is_first_user = db.query(User).count() == 0
    
    new_user = User(
        username=user_data.username, 
        password_hash=hashed_password,
        is_admin=is_first_user
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Error creating user"
        ) from err

    access_token = create_access_token(data={"sub": new_user.username})
    return TokenResponse(access_token=access_token, username=new_user.username)


@router.post("/signin", response_model=TokenResponse)
def signin(user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate an existing user."""
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=access_token, username=user.username)


class UserProfile(BaseModel):
    username: str
    display_name: str | None = None
    settings: dict | None = None
    is_admin: bool = False


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    password: str | None = None


class SettingsUpdate(BaseModel):
    settings: dict


@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the profile of the currently logged-in user."""
    return UserProfile(
        username=current_user.username,
        display_name=current_user.display_name,
        settings=current_user.get_settings(),
        is_admin=current_user.is_admin,
    )

@router.get("/admin/users")
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get all users."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "created_at": u.created_at,
            "is_admin": u.is_admin
        } for u in users
    ]


@router.put("/me/profile", response_model=UserProfile)
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update display name or password."""
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.password:
        current_user.password_hash = get_password_hash(data.password)
    db.commit()
    return UserProfile(
        username=current_user.username,
        display_name=current_user.display_name,
        settings=current_user.get_settings(),
    )


@router.put("/me/settings", response_model=UserProfile)
def update_settings(
    data: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user preferences/settings."""
    current_settings = current_user.get_settings()
    current_settings.update(data.settings)
    current_user.settings = json.dumps(current_settings)
    db.commit()
    return UserProfile(
        username=current_user.username,
        display_name=current_user.display_name,
        settings=current_settings,
    )
