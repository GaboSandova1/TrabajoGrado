from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app import auth, models
from app.db import get_session

router = APIRouter()


def _serialize_history(record: models.ProductHistory, session: Session) -> dict:
    user = session.get(models.User, record.user_id) if record.user_id else None
    return {
        "id": str(record.id),
        "type": record.action_type,
        "productName": record.product_name,
        "productUrl": record.product_url,
        "productName2": record.product_name_2,
        "productUrl2": record.product_url_2,
        "analyzedAt": record.created_at.isoformat(),
        "rating": record.rating,
        "rating1": record.rating_1,
        "rating2": record.rating_2,
        "reviewCount": record.review_count_requested,
        "recommendation": record.recommendation,
        "user": {
            "id": str(user.id) if user else None,
            "username": user.username if user else "N/D",
            "email": user.email if user else "-",
        },
    }


@router.get("/history/me")
def history_me(
    session: Session = Depends(get_session),
    user: models.User = Depends(auth.get_current_active_user),
):
    records = session.exec(
        select(models.ProductHistory).where(models.ProductHistory.user_id == user.id)
    ).all()
    records.sort(key=lambda item: item.created_at, reverse=True)
    return {"items": [_serialize_history(record, session) for record in records[:300]]}


@router.get("/history")
def history_all(
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    records = session.exec(select(models.ProductHistory)).all()
    records.sort(key=lambda item: item.created_at, reverse=True)
    return {"items": [_serialize_history(record, session) for record in records[:300]]}