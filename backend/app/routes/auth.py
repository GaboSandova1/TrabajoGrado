from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from app import auth, models
from app.config import settings
from app.db import get_session
from app.services.password_reset import send_password_reset_email

router = APIRouter()


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordConfirmRequest(BaseModel):
    uid: str = Field(..., min_length=1)
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/login")
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    identifier = payload.username.strip()
    user = session.exec(
        select(models.User).where(
            (models.User.username == identifier) | (models.User.email == identifier)
        )
    ).first()

    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta ha sido desactivada. Contacta al gerente para más información.",
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
@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    session: Session = Depends(get_session),
):
    email = str(payload.email).strip().lower()
    user = session.exec(select(models.User).where(models.User.email == email)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ese correo no está asignado a ningún usuario.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está desactivada. Contacta al gerente para recuperar el acceso.",
        )

    if not settings.email_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de correo no está configurado. Contacta al administrador.",
        )

    reset_token = auth.create_password_reset_token(user.id, user.email)
    email_sent = send_password_reset_email(user, reset_token)
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo enviar el correo de recuperación. Intenta más tarde.",
        )

    return {"message": "Enviamos un enlace de recuperación a tu correo."}


@router.post("/reset-password/confirm")
def reset_password_confirm(
    payload: ResetPasswordConfirmRequest,
    session: Session = Depends(get_session),
):
    try:
        user_id = int(payload.uid.strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación no es válido.",
        ) from exc

    claims = auth.verify_password_reset_token(payload.token.strip())
    if claims.get("uid") != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación no es válido.",
        )

    user = session.get(models.User, user_id)
    if not user or user.email != claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación no es válido.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está desactivada. Contacta al gerente.",
        )

    user.hashed_password = auth.get_password_hash(payload.new_password)
    session.add(user)
    session.commit()
    return {"message": "Tu contraseña se actualizó correctamente."}
