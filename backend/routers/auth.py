from typing import Any, Dict, Optional, cast
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, field_validator
from database import supabase, auth_supabase
from extensions import limiter

router = APIRouter()

_ALLOWED_COLORS = {"pink", "cyan", "yellow", "lime", "purple"}


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    username: str
    fighter_color: Optional[str] = "pink"

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 30:
            raise ValueError("Username must be 1-30 characters")
        return v


class LoginRequest(BaseModel):
    email: str  # accepts email address or username
    password: str


class UsernameRequest(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 30:
            raise ValueError("Username must be 1-30 characters")
        return v


def _username_taken(username: str) -> bool:
    res = supabase.table("profiles").select("id").eq("username", username).limit(1).execute()
    return len(res.data) > 0


@router.get("/check-username")
@limiter.limit("30/minute")
async def check_username(request: Request, username: str = Query(..., min_length=1, max_length=30)):
    return {"available": not _username_taken(username.strip())}


@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, req: SignupRequest):
    if _username_taken(req.username):
        raise HTTPException(status_code=409, detail="That username is already taken. Please choose a different one.")
    try:
        resp = auth_supabase.auth.sign_up({"email": req.email, "password": req.password})
        user = resp.user
        if user is None:
            raise HTTPException(status_code=409, detail="That email is already registered. Try logging in instead.")
        color = req.fighter_color if req.fighter_color in _ALLOWED_COLORS else "pink"
        supabase.table("profiles").insert(
            {"id": user.id, "username": req.username, "fighter_color": color}
        ).execute()
        supabase.table("reminder_preferences").insert({"user_id": user.id}).execute()
        return {"user_id": user.id, "access_token": resp.session.access_token if resp.session else None}
    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        if "already registered" in err or "already exists" in err or "user_already_exists" in err:
            raise HTTPException(status_code=409, detail="That email is already registered. Try logging in instead.")
        raise HTTPException(status_code=400, detail="Signup failed. Please try again.")


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, req: LoginRequest):
    try:
        # Resolve username → email when the identifier has no @
        email = req.email.strip()
        if "@" not in email:
            row = supabase.table("profiles").select("id").eq("username", email).limit(1).execute()
            if not row.data:
                raise HTTPException(status_code=401, detail="No account found for that username.")
            uid = cast(Dict[str, Any], row.data[0])["id"]
            user_info = auth_supabase.auth.admin.get_user_by_id(str(uid))
            if user_info.user is None or user_info.user.email is None:
                raise HTTPException(status_code=401, detail="Unable to resolve email for this user.")
            email = user_info.user.email

        resp = auth_supabase.auth.sign_in_with_password(
            {"email": email, "password": req.password}  # type: ignore[arg-type]
        )
        if resp.user is None or resp.session is None:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        user_id = resp.user.id
        profile = supabase.table("profiles").select("username").eq("id", user_id).limit(1).execute()
        username = cast(Dict[str, Any], profile.data[0]).get("username") if profile.data else None
        has_username = bool(username)
        return {
            "user_id": user_id,
            "access_token": resp.session.access_token,
            "has_username": has_username,
            "username": username,
        }
    except Exception as e:
        err = str(e).lower()
        if "email not confirmed" in err or "email_not_confirmed" in err:
            raise HTTPException(
                status_code=401,
                detail="Email not confirmed. Check your inbox and click the confirmation link, or disable email confirmation in Supabase Auth settings."
            )
        raise HTTPException(status_code=401, detail="Invalid email or password.")


@router.post("/set-username")
@limiter.limit("10/minute")
async def set_username(request: Request, req: UsernameRequest):
    authorization = request.headers.get("authorization") or request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        resp = auth_supabase.auth.get_user(token)
        if resp.user is None:  # type: ignore[union-attr]
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        user_id = resp.user.id  # type: ignore[union-attr]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if _username_taken(req.username):
        raise HTTPException(status_code=409, detail="That username is already taken. Please choose a different one.")
    existing = supabase.table("profiles").select("id").eq("id", user_id).limit(1).execute()
    if existing.data:
        supabase.table("profiles").update({"username": req.username}).eq("id", user_id).execute()
    else:
        supabase.table("profiles").insert({"id": user_id, "username": req.username}).execute()
        supabase.table("reminder_preferences").insert({"user_id": user_id}).execute()
    return {"ok": True}


@router.delete("/delete-account")
async def delete_account(user=Depends(get_current_user)):
    try:
        supabase.auth.admin.delete_user(user.id)
    except Exception as e:
        raise HTTPException(500, f"Could not delete account: {str(e)[:80]}")
    return {"ok": True}
