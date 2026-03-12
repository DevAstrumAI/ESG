from fastapi import APIRouter, HTTPException, status, Depends
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db
from datetime import datetime

router = APIRouter(tags=["Settings"])


@router.get("")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """
    Fetch the current company's reporting preferences and notification settings.
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

        # Get settings
        settings_doc = db.collection("settings").document(company_id).get()
        if not settings_doc.exists:
            raise HTTPException(status_code=404, detail="Settings not found.")

        return {"settings": settings_doc.to_dict()}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")


@router.put("")
async def update_settings(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the current company's settings.
    Accepts partial updates — only provided fields will be updated.

    Example body:
    {
        "reportingPreferences": {
            "defaultYear": 2026,
            "currency": "AED"
        },
        "notificationSettings": {
            "emailReports": false
        },
        "factorSource": "UAE MoCCaE"
    }
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

        # Build update payload
        update_data = {"updatedAt": datetime.utcnow().isoformat()}

        if "reportingPreferences" in body:
            for key, value in body["reportingPreferences"].items():
                update_data[f"reportingPreferences.{key}"] = value

        if "notificationSettings" in body:
            for key, value in body["notificationSettings"].items():
                update_data[f"notificationSettings.{key}"] = value

        if "factorSource" in body:
            update_data["factorSource"] = body["factorSource"]

        db.collection("settings").document(company_id).update(update_data)

        return {"message": "Settings updated successfully."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")