from fastapi import APIRouter, HTTPException, status, Depends
from firebase_admin import auth as firebase_auth
from app.models.user import UserCreate, UserProfile
from app.services.auth_service import verify_token, get_user, revoke_tokens
from app.middleware.auth import get_current_user
from app.utils.firebase import get_db

router = APIRouter(tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user.
    Creates the user in Firebase Auth and stores their profile in Firestore.
    """
    db = get_db()
    try:
        # Create user in Firebase Auth
        firebase_user = firebase_auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.displayName or "",
        )

        # Store user profile in Firestore
        import datetime
        db.collection("users").document(firebase_user.uid).set({
            "uid": firebase_user.uid,
            "email": user_data.email,
            "displayName": user_data.displayName or "",
            "companyId": None,
            "role": "admin",
            "createdAt": datetime.datetime.utcnow().isoformat(),
        })

        return {
            "message": "User registered successfully.",
            "uid": firebase_user.uid,
            "email": firebase_user.email,
        }

    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login")
async def login(body: dict):
    """
    Verify a Firebase ID token sent from the frontend after sign-in.
    Returns the user's Firestore profile.
    """
    db = get_db()
    id_token = body.get("idToken")
    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="idToken is required.",
        )

    decoded = verify_token(id_token)
    uid = decoded.get("uid")

    user_doc = db.collection("users").document(uid).get()

    if not user_doc.exists:
        # Auto-create profile for first-time Google Sign-in
        import datetime
        firebase_user = get_user(uid)
        db.collection("users").document(uid).set({
            "uid": uid,
            "email": firebase_user["email"],
            "displayName": firebase_user["displayName"] or "",
            "companyId": None,
            "role": "admin",
            "createdAt": datetime.datetime.utcnow().isoformat(),
        })
        user_doc = db.collection("users").document(uid).get()

    return {
        "message": "Login successful.",
        "user": user_doc.to_dict(),
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Return the current authenticated user's Firestore profile.
    Requires a valid Bearer token in the Authorization header.
    """
    db = get_db()
    uid = current_user.get("uid")

    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found.",
        )

    return {"user": user_doc.to_dict()}


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Revoke all refresh tokens for the current user.
    """
    uid = current_user.get("uid")
    revoke_tokens(uid)
    return {"message": "Logged out successfully. All sessions have been revoked."}