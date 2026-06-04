from sqlmodel import Session, select

from app import auth, models


def seed_default_users(session: Session) -> None:
    defaults = [
        {
            "username": "manager",
            "email": "manager@reviewai.local",
            "password": "manager123",
            "full_name": "Manager Demo",
            "role": "manager",
        },
        {
            "username": "employee",
            "email": "employee@reviewai.local",
            "password": "employee123",
            "full_name": "Employee Demo",
            "role": "employee",
        },
    ]

    for item in defaults:
        existing = session.exec(
            select(models.User).where(models.User.username == item["username"])
        ).first()
        if existing:
            continue
        session.add(
            models.User(
                username=item["username"],
                email=item["email"],
                hashed_password=auth.get_password_hash(item["password"]),
                full_name=item["full_name"],
                role=item["role"],
            )
        )
    session.commit()
