from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from app import auth, models
from app.db import get_session
from app.serializers import serialize_user
from app.services.notifications import send_welcome_credentials
from app.utils.uploads import save_user_photo
from app.utils.validation import (
    normalize_email,
    validate_cedula,
    validate_name,
    validate_phone,
    validate_username,
)

router = APIRouter()


class ActivateUserBody(BaseModel):
    is_active: bool


def _full_name(first_name: Optional[str], last_name: Optional[str]) -> Optional[str]:
    first = validate_name(first_name, "nombre")
    last = validate_name(last_name, "apellido")
    parts = [part for part in (first, last) if part]
    return " ".join(parts) if parts else None


def _ensure_unique(
    session: Session,
    *,
    username: str,
    email: str,
    exclude_id: Optional[int] = None,
) -> None:
    username_taken = session.exec(
        select(models.User).where(models.User.username == username)
    ).first()
    if username_taken and username_taken.id != exclude_id:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")

    email_taken = session.exec(select(models.User).where(models.User.email == email)).first()
    if email_taken and email_taken.id != exclude_id:
        raise HTTPException(status_code=400, detail="El correo electrónico ya existe")


@router.get("")
def list_users(
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    users = session.exec(select(models.User).order_by(models.User.username)).all()
    return [serialize_user(user) for user in users]


@router.get("/{user_id}")
def get_user(
    user_id: int,
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    user = session.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return serialize_user(user, detailed=True)


@router.post("")
async def create_user(
    username: str = Form(...),
    email: EmailStr = Form(...),
    password: str = Form(...),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    cedula: str = Form(...),
    telefono: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    username = validate_username(username)
    email = normalize_email(str(email))
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    if len(password) > 128:
        raise HTTPException(status_code=400, detail="La contraseña no puede superar 128 caracteres")

    _ensure_unique(session, username=username, email=email)
    photo_url = await save_user_photo(photo)

    user = models.User(
        username=username,
        email=email,
        hashed_password=auth.get_password_hash(password),
        full_name=_full_name(first_name, last_name),
        cedula=validate_cedula(cedula),
        phone=validate_phone(telefono),
        photo_url=photo_url,
        role="employee",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    email_sent = send_welcome_credentials(session, user=user, plain_password=password)
    payload = serialize_user(user, detailed=True)
    payload["email_sent"] = email_sent
    return payload


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    username: str = Form(...),
    email: EmailStr = Form(...),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    cedula: str = Form(...),
    telefono: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    user = session.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.role == "manager":
        raise HTTPException(status_code=400, detail="No se puede editar la cuenta del gerente")

    username = validate_username(username)
    email = normalize_email(str(email))
    _ensure_unique(session, username=username, email=email, exclude_id=user.id)

    user.username = username
    user.email = email
    user.full_name = _full_name(first_name, last_name)
    user.cedula = validate_cedula(cedula)
    user.phone = validate_phone(telefono)
    photo_url = await save_user_photo(photo)
    if photo_url:
        user.photo_url = photo_url

    session.add(user)
    session.commit()
    session.refresh(user)
    return serialize_user(user, detailed=True)


@router.patch("/{user_id}/activate")
def activate_user(
    user_id: int,
    body: ActivateUserBody,
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    user = session.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.role == "manager":
        raise HTTPException(status_code=400, detail="No se puede desactivar la cuenta del gerente")

    user.is_active = body.is_active
    session.add(user)
    session.commit()
    session.refresh(user)
    return serialize_user(user, detailed=True)
