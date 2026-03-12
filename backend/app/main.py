from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

from .routes import auth, companies, emissions, reports, settings, admin
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

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_origins = [
    "http://localhost:3000",
    "https://esg-project-app.vercel.app",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in _origins if o],  # Filter out empty strings
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
app.include_router(settings.router,  prefix="/api/settings",  tags=["Settings"])
app.include_router(admin.router,     prefix="/api/admin",     tags=["Admin"])

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