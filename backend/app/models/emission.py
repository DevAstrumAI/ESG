from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class EmissionFactor(BaseModel):
    """Model for emission factor data"""
    id: Optional[str] = None
    category: str
    region: str
    emirate: Optional[str] = None  # For UAE-specific factors
    value: float
    unit: str
    year: int = 2026
    source: Optional[str] = "Manual Entry"
    scope: Optional[str] = None  # "scope1", "scope2", etc.
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class EmissionFactorResponse(BaseModel):
    """Response model for emission factors"""
    factors: List[EmissionFactor]
    total: int
    filters: dict

class FactorFilter(BaseModel):
    """Filter parameters for querying factors"""
    region: Optional[str] = None
    category: Optional[str] = None
    year: Optional[int] = None
    scope: Optional[str] = None
    emirate: Optional[str] = None