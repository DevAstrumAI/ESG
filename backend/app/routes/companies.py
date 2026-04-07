from fastapi import APIRouter, HTTPException, status, Depends
from app.middleware.auth import get_current_user
from app.models.company import CompanyCreate, CompanyUpdate
from app.utils.firebase import get_db
from datetime import datetime
import uuid

router = APIRouter(tags=["Companies"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new company and link it to the current user.
    Called when the user completes the company setup wizard.
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        # Check if user already has a company
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found.")

        user_data = user_doc.to_dict()
        if user_data.get("companyId"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has a company. Use PUT to update it.",
            )

        # Generate company ID
        company_id = str(uuid.uuid4())

        # Save company to Firestore
        db.collection("companies").document(company_id).set({
            "basicInfo": {
                "name": company_data.name,
                "industry": company_data.industry,
                "employees": company_data.employees,
                "revenue": company_data.revenue,
                "region": company_data.region,
                "fiscalYear": company_data.fiscalYear,
            },
            "locations": [loc.dict() for loc in company_data.locations],
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat(),
        })

        # Link company to user
        db.collection("users").document(uid).update({"companyId": company_id})

        # Create default settings for the company
        db.collection("settings").document(company_id).set({
            "companyId": company_id,
            "reportingPreferences": {
                "defaultYear": company_data.fiscalYear,
                "defaultPeriod": "monthly",
                "currency": "USD",
                "distanceUnit": "km",
                "fuelUnit": "liters",
            },
            "notificationSettings": {
                "emailReports": True,
                "reminders": True,
            },
            "factorSource": "UAE MoCCaE",
            "updatedAt": datetime.utcnow().isoformat(),
        })

        return {
            "message": "Company created successfully.",
            "companyId": company_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create company: {str(e)}")


@router.get("/me")
async def get_my_company(current_user: dict = Depends(get_current_user)):
    """
    Fetch the current user's company data.
    Used to load the dashboard and company settings.
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        # Get user to find companyId
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found.")

        company_id = user_doc.to_dict().get("companyId")
        if not company_id:
            raise HTTPException(
                status_code=404,
                detail="No company found. Please complete the company setup.",
            )

        # Get company data
        company_doc = db.collection("companies").document(company_id).get()
        if not company_doc.exists:
            raise HTTPException(status_code=404, detail="Company data not found.")

        return {
            "companyId": company_id,
            "company": company_doc.to_dict(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch company: {str(e)}")


@router.put("/me")
async def update_my_company(
    company_data: CompanyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the current user's company info, locations, or fiscal year.
    """
    db = get_db()
    uid = current_user.get("uid")

    try:
        # Get companyId from user profile
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User profile not found.")

        company_id = user_doc.to_dict().get("companyId")
        if not company_id:
            raise HTTPException(status_code=404, detail="No company found.")

        # Build update payload — only include fields that were provided
        update_data = {"updatedAt": datetime.utcnow().isoformat()}

        if company_data.name is not None:
            update_data["basicInfo.name"] = company_data.name
        if company_data.industry is not None:
            update_data["basicInfo.industry"] = company_data.industry
        if company_data.employees is not None:
            update_data["basicInfo.employees"] = company_data.employees
        if company_data.revenue is not None:
            update_data["basicInfo.revenue"] = company_data.revenue
        if company_data.region is not None:
            update_data["basicInfo.region"] = company_data.region
        if company_data.fiscalYear is not None:
            update_data["basicInfo.fiscalYear"] = company_data.fiscalYear
        if company_data.locations is not None:
            update_data["locations"] = [loc.dict() for loc in company_data.locations]

        db.collection("companies").document(company_id).update(update_data)

        return {"message": "Company updated successfully."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update company: {str(e)}")