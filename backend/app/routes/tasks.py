from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app import auth, models
from app.db import get_session
from app.serializers import parse_due_date, serialize_task
from app.utils.validation import validate_task_description, validate_task_title
from app.services.notifications import (
    notify_task_assigned,
    notify_task_status_changed,
    notify_task_updated,
)

router = APIRouter()

VALID_STATUSES = {"pending", "in_progress", "done"}


class TaskWriteBody(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None


class TaskStatusBody(BaseModel):
    status: str


def _parse_assigned_id(value: Optional[str]) -> int:
    if not value:
        raise HTTPException(status_code=400, detail="Debes asignar la tarea a un empleado")
    try:
        return int(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Empleado asignado inválido") from exc


def _get_assignee(session: Session, user_id: int) -> models.User:
    user = session.get(models.User, user_id)
    if not user or user.role != "employee":
        raise HTTPException(status_code=400, detail="El empleado asignado no existe")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="El empleado asignado está inactivo")
    return user


@router.get("/me")
def tasks_me(
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    tasks = session.exec(
        select(models.Task).where(models.Task.assigned_to_id == user.id)
    ).all()
    tasks.sort(key=lambda item: item.created_at, reverse=True)
    return [serialize_task(task, session) for task in tasks]


@router.get("")
def tasks_list(
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    tasks = session.exec(select(models.Task)).all()
    tasks.sort(key=lambda item: item.created_at, reverse=True)
    return [serialize_task(task, session) for task in tasks]


@router.post("")
def create_task(
    body: TaskWriteBody,
    session: Session = Depends(get_session),
    manager: models.User = Depends(auth.get_current_manager),
):
    assignee = _get_assignee(session, _parse_assigned_id(body.assigned_to))
    title = validate_task_title(body.title)
    description = validate_task_description(body.description)
    due_date = parse_due_date(body.due_date, strict=bool(body.due_date))
    now = datetime.utcnow()
    task = models.Task(
        title=title,
        description=description,
        status="pending",
        due_date=due_date,
        assigned_to_id=assignee.id,
        created_by_id=manager.id,
        created_at=now,
        updated_at=now,
        completed=False,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    notify_task_assigned(session, task=task, assignee=assignee, manager=manager)
    return serialize_task(task, session)


@router.patch("/{task_id}")
def update_task(
    task_id: int,
    body: TaskWriteBody,
    session: Session = Depends(get_session),
    manager: models.User = Depends(auth.get_current_manager),
):
    task = session.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    previous_assignee_id = task.assigned_to_id
    assignee = _get_assignee(session, _parse_assigned_id(body.assigned_to))
    task.title = validate_task_title(body.title)
    task.description = validate_task_description(body.description)
    task.assigned_to_id = assignee.id
    task.due_date = parse_due_date(body.due_date, strict=bool(body.due_date))
    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)

    if previous_assignee_id != assignee.id:
        notify_task_assigned(session, task=task, assignee=assignee, manager=manager)
    else:
        notify_task_updated(session, task=task, assignee=assignee, manager=manager)
    return serialize_task(task, session)


@router.patch("/{task_id}/status")
def update_task_status(
    task_id: int,
    body: TaskStatusBody,
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Estado de tarea inválido")

    task = session.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if task.assigned_to_id != user.id:
        raise HTTPException(status_code=403, detail="No puedes actualizar esta tarea")

    previous_status = task.status
    task.status = body.status
    task.completed = body.status == "done"
    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)

    if previous_status != body.status:
        notify_task_status_changed(
            session, task=task, employee=user, new_status=body.status
        )
    return serialize_task(task, session)


@router.delete("/{task_id}/delete")
def delete_task(
    task_id: int,
    session: Session = Depends(get_session),
    manager: models.User = Depends(auth.get_current_manager),
):
    task = session.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if task.created_by_id != manager.id:
        raise HTTPException(status_code=403, detail="Solo puedes eliminar tus propias tareas")

    session.delete(task)
    session.commit()
    return {"message": "Tarea eliminada"}
