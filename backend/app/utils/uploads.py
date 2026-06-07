import io
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_BYTES = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/pjpeg", "image/jfif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def _reject_unsupported_format() -> None:
    raise HTTPException(
        status_code=400,
        detail="Solo se permiten imágenes JPG o PNG (máx. 5 MB).",
    )


def _normalize_image(content: bytes) -> tuple[bytes, str]:
    try:
        image = Image.open(io.BytesIO(content))
        image.load()
    except UnidentifiedImageError as exc:
        _reject_unsupported_format()
        raise exc

    image_format = (image.format or "").upper()
    if image_format not in {"JPEG", "PNG"}:
        _reject_unsupported_format()

    has_alpha = image_format == "PNG" and image.mode in {"RGBA", "LA", "P"}

    buffer = io.BytesIO()
    if has_alpha:
        image = image.convert("RGBA")
        image.save(buffer, format="PNG", optimize=True)
        return buffer.getvalue(), ".png"

    image = image.convert("RGB")
    image.save(buffer, format="JPEG", quality=88, optimize=True)
    return buffer.getvalue(), ".jpg"


async def save_user_photo(photo: Optional[UploadFile]) -> Optional[str]:
    if not photo:
        return None

    filename = (photo.filename or "").strip()
    content_type = (photo.content_type or "").split(";")[0].strip().lower()
    content = await photo.read()

    if not content:
        return None
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail="La imagen no puede superar 5 MB",
        )

    suffix = Path(filename).suffix.lower() if filename else ""
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        _reject_unsupported_format()
    if suffix and suffix not in ALLOWED_EXTENSIONS:
        _reject_unsupported_format()

    normalized, suffix = _normalize_image(content)
    if len(normalized) > MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail="La imagen procesada supera 5 MB. Prueba con una imagen más pequeña.",
        )

    stored_name = f"{uuid.uuid4().hex}{suffix}"
    destination = UPLOAD_DIR / stored_name
    destination.write_bytes(normalized)
    return f"/uploads/{stored_name}"
