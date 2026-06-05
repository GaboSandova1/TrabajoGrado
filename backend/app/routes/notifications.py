from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app import auth, models
from app.db import get_session
from app.services.notifications import serialize_notification

router = APIRouter()


@router.get("")
def notifications_list(
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    records = session.exec(
        select(models.Notification).where(models.Notification.user_id == user.id)
    ).all()
    records.sort(key=lambda item: item.created_at, reverse=True)
    return [serialize_notification(record, session) for record in records]


@router.get("/unread-count")
def unread_count(
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    records = session.exec(
        select(models.Notification).where(
            models.Notification.user_id == user.id,
            models.Notification.read == False,  # noqa: E712
        )
    ).all()
    return {"count": len(records)}


@router.patch("/read-all")
def read_all(
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    records = session.exec(
        select(models.Notification).where(
            models.Notification.user_id == user.id,
            models.Notification.read == False,  # noqa: E712
        )
    ).all()
    for record in records:
        record.read = True
        session.add(record)
    session.commit()
    return {"message": "ok"}


@router.patch("/{notification_id}/read")
def read_one(
    notification_id: int,
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    record = session.get(models.Notification, notification_id)
    if not record or record.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    record.read = True
    session.add(record)
    session.commit()
    session.refresh(record)
    return serialize_notification(record, session)
