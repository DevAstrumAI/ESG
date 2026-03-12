from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    displayName: Optional[str] = None

class UserProfile(BaseModel):
    uid: str
    email: str
    displayName: Optional[str] = None
    companyId: Optional[str] = None
    role: str = "admin"