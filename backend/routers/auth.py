from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, field_validator
from database import supabase, auth_supabase
from extensions import limiter

router = APIRouter()


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    username: str

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
    email: EmailStr
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
        supabase.table("profiles").insert(
            {"id": user.id, "username": req.username}
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
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest):
    try:
        resp = auth_supabase.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        user_id = resp.user.id
        profile = supabase.table("profiles").select("username").eq("id", user_id).limit(1).execute()
        has_username = bool(profile.data and profile.data[0].get("username"))
        return {
            "user_id": user_id,
            "access_token": resp.session.access_token,
            "has_username": has_username,
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password.")


@router.post("/set-username")
@limiter.limit("10/minute")
async def set_username(request: Request, req: UsernameRequest):
    from database import auth_supabase
    authorization = request.headers.get("authorization") or request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        resp = auth_supabase.auth.get_user(token)
        user_id = resp.user.id
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
