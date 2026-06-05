from datetime import date, datetime
from typing import Optional

from app import models
from app.config import settings


def _split_full_name(full_name: Optional[str]) -> tuple[str, str]:
    if not full_name:
        return "", ""
    parts = full_name.split(" ", 1)
    return parts[0], parts[1] if len(parts) > 1 else ""


def _photo_public_url(photo_url: Optional[str]) -> Optional[str]:
    if not photo_url:
        return None
    if photo_url.startswith(("http://", "https://", "data:")):
        return photo_url
    base = settings.API_BASE_URL.rstrip("/")
    path = photo_url if photo_url.startswith("/") else f"/{photo_url}"
    return f"{base}{path}"


def serialize_user(user: models.User, *, detailed: bool = False) -> dict:
    first_name, last_name = _split_full_name(user.full_name)
    created_at = getattr(user, "created_at", None) or datetime.utcnow()
    payload = {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "photo_url": _photo_public_url(user.photo_url),
        "is_active": user.is_active,
        "created_at": created_at.isoformat(),
        "role": user.role,
    }
    if detailed:
        payload["firstName"] = first_name
        payload["lastName"] = last_name
        payload["cedula"] = user.cedula
    return payload


def serialize_user_option(user: models.User) -> dict:
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
    }


def _format_date(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    return value.date().isoformat()


def serialize_task(task: models.Task, session) -> dict:
    assigned = session.get(models.User, task.assigned_to_id) if task.assigned_to_id else None
    creator = session.get(models.User, task.created_by_id) if task.created_by_id else None
    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description or "",
        "status": task.status,
        "due_date": _format_date(task.due_date),
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
        "assigned_to": serialize_user_option(assigned) if assigned else None,
        "created_by": serialize_user_option(creator) if creator else None,
    }


def parse_due_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        parsed = date.fromisoformat(str(value)[:10])
        return datetime(parsed.year, parsed.month, parsed.day)
    except ValueError:
        return None
