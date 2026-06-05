import logging
from typing import Optional

from sqlmodel import Session

from app import models
from app.config import settings
from app.utils.email import send_email

logger = logging.getLogger(__name__)

STATUS_LABELS = {
    "pending": "Pendiente",
    "in_progress": "En progreso",
    "done": "Finalizada",
}


def serialize_notification(notification: models.Notification, session: Session) -> dict:
    task_payload = None
    if notification.task_id:
        task = session.get(models.Task, notification.task_id)
        if task:
            task_payload = {"id": str(task.id), "title": task.title}

    return {
        "id": str(notification.id),
        "kind": notification.kind or "general",
        "title": notification.title or "Notificación",
        "message": notification.message,
        "is_read": notification.read,
        "created_at": notification.created_at.isoformat(),
        "task": task_payload,
    }


def create_notification(
    session: Session,
    *,
    user_id: int,
    kind: str,
    title: str,
    message: str,
    task_id: Optional[int] = None,
) -> models.Notification:
    notification = models.Notification(
        user_id=user_id,
        kind=kind,
        title=title,
        message=message,
        task_id=task_id,
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def notify_user(
    session: Session,
    *,
    user: models.User,
    kind: str,
    title: str,
    message: str,
    task_id: Optional[int] = None,
    email_subject: Optional[str] = None,
    email_body: Optional[str] = None,
) -> models.Notification:
    notification = create_notification(
        session,
        user_id=user.id,
        kind=kind,
        title=title,
        message=message,
        task_id=task_id,
    )

    if email_subject and email_body:
        send_email(user.email, email_subject, email_body)

    return notification


def send_welcome_credentials(
    session: Session,
    *,
    user: models.User,
    plain_password: str,
) -> bool:
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    title = "Bienvenido a AreaMedic"
    message = (
        f"Tu cuenta fue creada. Usuario: {user.username}. "
        f"Inicia sesión en {login_url}"
    )

    create_notification(
        session,
        user_id=user.id,
        kind="account",
        title=title,
        message=message,
    )

    subject = "AreaMedic — Credenciales de acceso"
    body = f"""Hola {user.full_name or user.username},

Tu cuenta en AreaMedic fue creada correctamente.

Credenciales de acceso:
  Usuario: {user.username}
  Correo: {user.email}
  Contraseña: {plain_password}

Puedes iniciar sesión aquí:
  {login_url}

Puedes usar tu nombre de usuario o tu correo electrónico para entrar.

Saludos,
Equipo AreaMedic
"""
    html = f"""
<html><body style="font-family: Arial, sans-serif; color: #222;">
  <h2>Bienvenido a AreaMedic</h2>
  <p>Hola <strong>{user.full_name or user.username}</strong>,</p>
  <p>Tu cuenta fue creada correctamente. Estas son tus credenciales:</p>
  <ul>
    <li><strong>Usuario:</strong> {user.username}</li>
    <li><strong>Correo:</strong> {user.email}</li>
    <li><strong>Contraseña:</strong> {plain_password}</li>
  </ul>
  <p><a href="{login_url}">Iniciar sesión en AreaMedic</a></p>
  <p style="color:#666;font-size:12px;">Puedes usar tu usuario o correo para entrar.</p>
</body></html>
"""
    return send_email(user.email, subject, body, html=html)


def notify_task_assigned(
    session: Session,
    *,
    task: models.Task,
    assignee: models.User,
    manager: models.User,
) -> None:
    due = task.due_date.strftime("%d/%m/%Y") if task.due_date else "Sin fecha límite"
    title = "Nueva tarea asignada"
    message = (
        f"{manager.username} te asignó la tarea «{task.title}». "
        f"Fecha límite: {due}."
    )
    subject = f"AreaMedic — {title}"
    body = f"""Hola {assignee.full_name or assignee.username},

{manager.username} te asignó una nueva tarea:

  Título: {task.title}
  Descripción: {task.description or '—'}
  Fecha límite: {due}
  Estado: Pendiente

Revisa tus tareas en AreaMedic:
  {settings.FRONTEND_URL.rstrip('/')}/employee/tasks

Saludos,
Equipo AreaMedic
"""
    notify_user(
        session,
        user=assignee,
        kind="task_assigned",
        title=title,
        message=message,
        task_id=task.id,
        email_subject=subject,
        email_body=body,
    )


def notify_task_updated(
    session: Session,
    *,
    task: models.Task,
    assignee: models.User,
    manager: models.User,
) -> None:
    due = task.due_date.strftime("%d/%m/%Y") if task.due_date else "Sin fecha límite"
    title = "Tarea actualizada"
    message = f"La tarea «{task.title}» fue actualizada. Fecha límite: {due}."
    subject = f"AreaMedic — {title}"
    body = f"""Hola {assignee.full_name or assignee.username},

La tarea asignada fue actualizada por {manager.username}:

  Título: {task.title}
  Descripción: {task.description or '—'}
  Fecha límite: {due}

Ver tareas:
  {settings.FRONTEND_URL.rstrip('/')}/employee/tasks
"""
    notify_user(
        session,
        user=assignee,
        kind="task_updated",
        title=title,
        message=message,
        task_id=task.id,
        email_subject=subject,
        email_body=body,
    )


def notify_task_status_changed(
    session: Session,
    *,
    task: models.Task,
    employee: models.User,
    new_status: str,
) -> None:
    if not task.created_by_id:
        return

    manager = session.get(models.User, task.created_by_id)
    if not manager:
        return

    status_label = STATUS_LABELS.get(new_status, new_status)
    title = "Estado de tarea actualizado"
    message = (
        f"{employee.username} cambió el estado de «{task.title}» a {status_label}."
    )
    subject = f"AreaMedic — {title}"
    body = f"""Hola {manager.full_name or manager.username},

{employee.username} actualizó una tarea que asignaste:

  Tarea: {task.title}
  Nuevo estado: {status_label}

Ver tareas:
  {settings.FRONTEND_URL.rstrip('/')}/manager/tasks
"""
    notify_user(
        session,
        user=manager,
        kind="task_status",
        title=title,
        message=message,
        task_id=task.id,
        email_subject=subject,
        email_body=body,
    )
