from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app import auth, models
from app.db import get_session

router = APIRouter()


def _build_time_series(days: int, counts_by_day: dict[str, int]) -> list[dict]:
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)
    series: list[dict] = []
    current = start_date
    while current <= end_date:
        day_key = current.isoformat()
        series.append({"date": day_key, "count": counts_by_day.get(day_key, 0)})
        current += timedelta(days=1)
    return series


@router.get("/stats")
def dashboard_stats(
    days: int = Query(default=30, ge=1, le=365),
    session: Session = Depends(get_session),
    _: models.User = Depends(auth.get_current_manager),
):
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)
    since = datetime.combine(start_date, datetime.min.time())

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

    return {
        "total_products_analyzed": len(records),
        "active_users": active_users,
        "inactive_users": inactive_users,
        "total_users": len(users),
        "time_series": _build_time_series(days, counts_by_day),
        "days": days,
    }
