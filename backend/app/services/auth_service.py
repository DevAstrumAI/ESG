from firebase_admin import auth
from fastapi import HTTPException, status


def verify_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded token payload.
    Raises HTTP 401 if the token is invalid or expired.
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. Please sign in again.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


def get_user(uid: str) -> dict:
    """
    Fetch a Firebase Auth user record by UID.
    Raises HTTP 404 if the user does not exist.
    """
    try:
        user = auth.get_user(uid)
        return {
            "uid": user.uid,
            "email": user.email,
            "displayName": user.display_name,
            "emailVerified": user.email_verified,
            "photoURL": user.photo_url,
        }
    except auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with UID '{uid}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user: {str(e)}",
        )


def revoke_tokens(uid: str) -> None:
    """
    Revoke all refresh tokens for a user (used on sign-out or account suspension).
    """
    try:
        auth.revoke_refresh_tokens(uid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke tokens: {str(e)}",
        )