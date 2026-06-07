import re
from typing import Optional

from fastapi import HTTPException

from app.utils.amazon import extract_asin

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
NAME_REGEX = re.compile(r"^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$")
USERNAME_REGEX = re.compile(r"^[A-Za-z0-9._-]{3,50}$")


def _bad_request(message: str) -> HTTPException:
    return HTTPException(status_code=400, detail=message)


def normalize_email(email: str) -> str:
    value = email.strip().lower()
    if not value or len(value) > 254 or not EMAIL_REGEX.match(value):
        raise _bad_request("Ingresa un correo electrónico válido.")
    return value


def validate_username(username: str) -> str:
    value = username.strip()
    if not value or not USERNAME_REGEX.match(value):
        raise _bad_request(
            "El nombre de usuario debe tener 3-50 caracteres (letras, números, . _ -)."
        )
    return value


def validate_name(value: Optional[str], label: str, *, required: bool = False) -> Optional[str]:
    if value is None or not str(value).strip():
        if required:
            raise _bad_request(f"El {label} es obligatorio.")
        return None
    cleaned = str(value).strip()
    if not NAME_REGEX.match(cleaned):
        raise _bad_request(f"El {label} solo puede contener letras.")
    if len(cleaned) > 60:
        raise _bad_request(f"El {label} es demasiado largo.")
    return cleaned


def validate_cedula(cedula: str) -> str:
    value = (cedula or "").strip()
    if not value.isdigit() or len(value) < 7 or len(value) > 9:
        raise _bad_request("La cédula debe tener entre 7 y 9 dígitos.")
    return value


def validate_phone(phone: str) -> str:
    value = (phone or "").strip()
    if not value.isdigit() or len(value) != 11:
        raise _bad_request("El teléfono debe tener exactamente 11 dígitos.")
    return value


def validate_amazon_url(url: str) -> str:
    value = (url or "").strip()
    if not value:
        raise _bad_request("La URL del producto es obligatoria.")
    if len(value) > 2048:
        raise _bad_request("La URL es demasiado larga.")
    if not value.startswith(("http://", "https://")):
        raise _bad_request("Ingresa una URL válida de Amazon.")
    if not extract_asin(value):
        raise _bad_request(
            "Ingresa una URL válida de Amazon con el ASIN del producto."
        )
    return value


def validate_task_title(title: str) -> str:
    value = (title or "").strip()
    if not value:
        raise _bad_request("El título de la tarea es obligatorio.")
    if len(value) < 3:
        raise _bad_request("El título debe tener al menos 3 caracteres.")
    if len(value) > 200:
        raise _bad_request("El título no puede superar 200 caracteres.")
    return value


def validate_task_description(description: Optional[str]) -> Optional[str]:
    if description is None:
        return None
    value = description.strip()
    if not value:
        return None
    if len(value) > 1000:
        raise _bad_request("La descripción no puede superar 1000 caracteres.")
    return value


def validate_review_count(review_count: int) -> int:
    allowed = {10, 25, 50}
    try:
        value = int(review_count)
    except (TypeError, ValueError) as exc:
        raise _bad_request("Selecciona una cantidad de reseñas válida.") from exc
    if value not in allowed:
        raise _bad_request("Selecciona una cantidad de reseñas válida (10, 25 o 50).")
    return value
