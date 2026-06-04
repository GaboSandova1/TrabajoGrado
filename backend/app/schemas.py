from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "employee"

class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    role: str
    is_active: bool

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None

class TaskRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    created_at: datetime
    due_date: Optional[datetime]
    completed: bool
    assigned_to_id: Optional[int]

    class Config:
        orm_mode = True

class NotificationRead(BaseModel):
    id: int
    message: str
    created_at: datetime
    read: bool

    class Config:
        orm_mode = True

class HistoryRead(BaseModel):
    id: int
    action: str
    details: Optional[str]
    timestamp: datetime

    class Config:
        orm_mode = True

class ScrapeRequest(BaseModel):
    asin: str
    marketplace: Optional[str] = "amazon.com"

# ── ANALYSIS INPUT ─────────────────────────────────
class AnalysisRequest(BaseModel):
    asin: str
    marketplace: Optional[str] = "amazon.com"
    prompt: Optional[str] = None  # Puedes personalizar el prompt según tu caso de uso