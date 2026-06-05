import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str, *, html: Optional[str] = None) -> bool:
    if not settings.email_configured:
        logger.warning("SMTP no configurado: no se envió correo a %s", to)
        return False

    from_addr = settings.from_email or settings.smtp_user
    if not from_addr:
        logger.warning("Remitente de correo no configurado")
        return False

    msg = EmailMessage()
    msg["From"] = from_addr
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            if settings.EMAIL_USE_TLS:
                server.starttls(context=context)
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info("Correo enviado a %s — %s", to, subject)
        return True
    except Exception:
        logger.exception("Error enviando correo a %s", to)
        return False
