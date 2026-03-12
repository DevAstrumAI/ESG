from pydantic import BaseModel
from typing import Optional

class EmissionFactor(BaseModel):
    region: str
    country: str
    city: str
    scope: str
    category: str
    factor_name: str
    value: float
    unit: str
    source: Optional[str] = "Manual Entry"
    year: Optional[int] = 2026