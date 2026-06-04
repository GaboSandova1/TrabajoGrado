from datetime import datetime
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: Optional[str] = None
    role: str = Field(default="employee")
    is_active: bool = Field(default=True)

    tasks: List["Task"] = Relationship(
        back_populates="assigned_to",
        sa_relationship_kwargs={"foreign_keys": "[Task.assigned_to_id]"},
    )
    notifications: List["Notification"] = Relationship(back_populates="user")
    histories: List["ProductHistory"] = Relationship(back_populates="user")


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    status: str = Field(default="pending")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    completed: bool = Field(default=False)

    assigned_to_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_by_id: Optional[int] = Field(default=None, foreign_key="user.id")
    assigned_to: Optional[User] = Relationship(
        back_populates="tasks",
        sa_relationship_kwargs={"foreign_keys": "[Task.assigned_to_id]"},
    )


class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = Field(default=False)

    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="notifications")


class ProductHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    action_type: str = Field(default="analysis")
    product_name: str = ""
    product_url: str = ""
    product_name_2: Optional[str] = None
    product_url_2: Optional[str] = None
    rating: Optional[float] = None
    rating_1: Optional[float] = None
    rating_2: Optional[float] = None
    review_count_requested: int = 10
    recommendation: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="histories")
