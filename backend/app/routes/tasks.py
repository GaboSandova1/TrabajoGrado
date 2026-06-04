from fastapi import APIRouter, Depends

from app import auth, models

router = APIRouter()


@router.get("/me")
def tasks_me(_: models.User = Depends(auth.get_current_active_user)):
    return []


@router.get("")
def tasks_list(_: models.User = Depends(auth.get_current_manager)):
    return []
