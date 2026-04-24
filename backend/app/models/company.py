from pydantic import BaseModel
from typing import Optional, List

class Location(BaseModel):
    city: str
    country: str
    isPrimary: bool = False

class CompanyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    logo: Optional[str] = None
    industry: str
    employees: Optional[int] = None
    revenue: Optional[float] = None
    region: Optional[str] = None
    fiscalYear: int = 2026
    locations: Optional[List[Location]] = []

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    industry: Optional[str] = None
    employees: Optional[int] = None
    revenue: Optional[float] = None
    region: Optional[str] = None
    fiscalYear: Optional[int] = None
    locations: Optional[List[Location]] = None