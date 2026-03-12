from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import verify_token

# This tells FastAPI to expect a Bearer token in the Authorization header
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency that extracts and verifies the Bearer token.
    Inject this into any route that requires authentication.

    Usage:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"uid": user["uid"]}
    """
    token = credentials.credentials
    return verify_token(token)


def require_role(required_role: str):
    """
    Factory dependency that checks the user's role from Firestore.
    Use this for admin-only or role-restricted routes.

    Usage:
        @router.delete("/admin/factors/{id}")
        async def delete_factor(user: dict = Depends(require_role("admin"))):
            ...
    """
    from app.utils.firebase import get_db

    def role_checker(user: dict = Depends(get_current_user)) -> dict:
        db = get_db()
        uid = user.get("uid")

        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found.",
            )

        role = user_doc.to_dict().get("role", "viewer")
        allowed_roles = _role_hierarchy(required_role)

        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: '{required_role}', your role: '{role}'.",
            )

        return {**user, "role": role, "companyId": user_doc.to_dict().get("companyId")}

    return role_checker


def _role_hierarchy(required_role: str) -> list[str]:
    """
    Define which roles satisfy a required role.
    admin > editor > viewer
    """
    hierarchy = {
        "viewer": ["viewer", "editor", "admin"],
        "editor": ["editor", "admin"],
        "admin": ["admin"],
    }
    return hierarchy.get(required_role, [required_role])