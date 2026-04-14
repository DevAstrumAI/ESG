# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, companies, emissions, reports, settings, predictions, admin
from app.utils.firebase import initialize_firebase

app = FastAPI(title="Lumyna ESG API", version="1.0.0")

# Initialize Firebase Admin SDK before route handling
initialize_firebase()

# Configure CORS properly - this must be BEFORE including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React dev server
        "http://localhost:3001",      # Alternative React port
        "http://127.0.0.1:3000",      # Localhost alias
        "https://esg-frontend.onrender.com",  # Production frontend 
        "https://esg-frontend-testing-onrender.com", #Testing link
        "https://esg-frontend-dev-onrender.com", #Testing link
    ],
    allow_origin_regex=r"http://localhost(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(emissions.router, prefix="/api/emissions", tags=["Emissions"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(predictions.router, prefix="/api", tags=["Predictions"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/")
async def root():
    return {"message": "Lumyna ESG API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}