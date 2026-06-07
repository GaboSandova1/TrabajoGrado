from app import models
from app.config import settings
from app.utils.email import send_email


def send_password_reset_email(user: models.User, token: str) -> bool:
    reset_url = (
        f"{settings.FRONTEND_URL.rstrip('/')}/reset-password"
        f"?uid={user.id}&token={token}"
    )
    subject = "ReviewAI — Recuperación de contraseña"
    body = f"""Hola {user.full_name or user.username},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en ReviewAI.

Haz clic en el siguiente enlace para crear una nueva contraseña:
  {reset_url}

Este enlace expira en {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutos.

Si no solicitaste este cambio, ignora este correo.

Saludos,
Equipo ReviewAI
"""
    html = f"""
<html><body style="font-family: Arial, sans-serif; color: #222;">
  <h2>Recuperación de contraseña</h2>
  <p>Hola <strong>{user.full_name or user.username}</strong>,</p>
  <p>Recibimos una solicitud para restablecer tu contraseña en ReviewAI.</p>
  <p><a href="{reset_url}">Restablecer contraseña</a></p>
  <p style="color:#666;font-size:12px;">
    El enlace expira en {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutos.
    Si no solicitaste este cambio, ignora este correo.
  </p>
</body></html>
"""
    return send_email(user.email, subject, body, html=html)
