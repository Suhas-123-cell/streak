from fastapi import APIRouter, HTTPException, Request
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


@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, req: SignupRequest):
    try:
        resp = auth_supabase.auth.sign_up({"email": req.email, "password": req.password})
        user = resp.user
        supabase.table("profiles").insert(
            {"id": user.id, "username": req.username}
        ).execute()
        supabase.table("reminder_preferences").insert({"user_id": user.id}).execute()
        return {"user_id": user.id, "access_token": resp.session.access_token if resp.session else None}
    except Exception:
        raise HTTPException(status_code=400, detail="Signup failed. Email may already be in use.")


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest):
    try:
        resp = auth_supabase.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        return {
            "user_id": resp.user.id,
            "access_token": resp.session.access_token,
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
