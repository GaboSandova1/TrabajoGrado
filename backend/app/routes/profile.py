from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import EmailStr
from sqlmodel import Session

from app import auth, models
from app.db import get_session
from app.routes.users import _ensure_unique, _full_name
from app.serializers import serialize_auth_user
from app.utils.uploads import save_user_photo
from app.utils.validation import (
    normalize_email,
    validate_cedula,
    validate_name,
    validate_phone,
    validate_username,
)

router = APIRouter()


@router.patch("/me")
async def update_my_profile(
    username: str = Form(...),
    email: EmailStr = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    cedula: str = Form(...),
    phone: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: models.User = Depends(auth.get_current_active_user),
):
    username = validate_username(username)
    email = normalize_email(str(email))
    validate_name(first_name, "nombre", required=True)
    validate_name(last_name, "apellido", required=True)

    _ensure_unique(
        session,
        username=username,
        email=email,
        exclude_id=current_user.id,
    )

    current_user.username = username
    current_user.email = email
    current_user.full_name = _full_name(first_name, last_name)
    current_user.cedula = validate_cedula(cedula)
    current_user.phone = validate_phone(phone)

    photo_url = await save_user_photo(photo)
    if photo_url:
        current_user.photo_url = photo_url

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return serialize_auth_user(current_user)
