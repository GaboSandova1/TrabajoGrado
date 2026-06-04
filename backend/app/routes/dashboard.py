from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app import auth, models
from app.db import get_session

router = APIRouter()


@router.get("/stats")
def dashboard_stats(
    days: int = 30,
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    since = datetime.utcnow() - timedelta(days=max(1, min(days, 365)))
    records = session.exec(
        select(models.ProductHistory).where(models.ProductHistory.created_at >= since)
    ).all()

    users = session.exec(select(models.User)).all()
    active_users = sum(1 for user in users if user.is_active)
    inactive_users = len(users) - active_users

    counts_by_day: dict[str, int] = {}
    for record in records:
        day = record.created_at.date().isoformat()
        counts_by_day[day] = counts_by_day.get(day, 0) + 1

    time_series = [
        {"date": day, "count": count}
        for day, count in sorted(counts_by_day.items())
    ]

    return {
        "total_products_analyzed": len(records),
        "active_users": active_users,
        "inactive_users": inactive_users,
        "total_users": len(users),
        "time_series": time_series,
    }
