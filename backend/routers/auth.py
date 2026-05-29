from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import supabase

router = APIRouter()


class SignupRequest(BaseModel):
    email: str
    password: str
    username: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(req: SignupRequest):
    try:
        resp = supabase.auth.sign_up({"email": req.email, "password": req.password})
        user = resp.user
        supabase.table("profiles").insert(
            {"id": user.id, "username": req.username}
        ).execute()
        supabase.table("reminder_preferences").insert({"user_id": user.id}).execute()
        return {"user_id": user.id, "access_token": resp.session.access_token if resp.session else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    try:
        resp = supabase.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        return {
            "user_id": resp.user.id,
            "access_token": resp.session.access_token,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
