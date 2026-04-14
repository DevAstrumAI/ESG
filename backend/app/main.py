from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
from app.utils.firebase import get_db


from app.routes import predictions
from .routes import auth, companies, emissions,  reports, formal_report, settings, admin
from .utils.firebase import initialize_firebase

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    initialize_firebase()
    yield


# Create FastAPI app
app = FastAPI(
    title="ESG Calculator API",
    description="Backend API for emission calculations",
    version="1.0.0",
    lifespan=lifespan,
)
@app.on_event("startup")
async def startup_event():
    get_db()  # initialise Firebase at startup, not on first request


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://esg-frontend.onrender.com",
    "https://esg-frontend-dev.onrender.com",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    # Keep explicit origins because credentials are enabled.
    allow_origins=list({origin for origin in _origins if origin}),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(emissions.router, prefix="/api/emissions", tags=["Emissions"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["Reports"])
app.include_router(formal_report.router, prefix="/api/formal-report", tags=["Formal Report"])
app.include_router(settings.router,  prefix="/api/settings",  tags=["Settings"])
app.include_router(admin.router,     prefix="/api/admin",     tags=["Admin"])
app.include_router(predictions.router, prefix="/api")

print(f"Routes registered: {[r.path for r in app.routes]}")

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "message": "ESG Calculator API",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "firebase": "connected"}
