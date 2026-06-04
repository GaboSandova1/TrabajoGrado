from fastapi import APIRouter, Depends

from app import auth, models

router = APIRouter()


@router.get("")
def notifications_list(_: models.User = Depends(auth.get_current_active_user)):
    return []


@router.get("/unread-count")
def unread_count(_: models.User = Depends(auth.get_current_active_user)):
    return {"count": 0}


@router.patch("/read-all")
def read_all(_: models.User = Depends(auth.get_current_active_user)):
    return {"message": "ok"}


@router.patch("/{notification_id}/read")
def read_one(notification_id: int, _: models.User = Depends(auth.get_current_active_user)):
    return {"id": notification_id, "read": True}
