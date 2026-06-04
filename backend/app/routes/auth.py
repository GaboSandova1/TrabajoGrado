from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session

from app import auth, models
from app.config import settings
from app.db import get_session

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/login")
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    user = auth.authenticate_user(session, payload.username.strip(), payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = auth.create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"token": token, "user": auth.serialize_user(user)}


@router.get("/me")
def me(current_user: models.User = Depends(auth.get_current_active_user)):
    return auth.serialize_user(current_user)


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}


@router.post("/forgot-password/")
def forgot_password(_: ForgotPasswordRequest):
    return {"message": "If email exists, password reset instructions have been sent"}
