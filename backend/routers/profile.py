from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase
from middleware.auth import get_current_user

router = APIRouter()


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    reminder_time: Optional[str] = None
    timezone: Optional[str] = None
    reminders_enabled: Optional[bool] = None
    fcm_token: Optional[str] = None


@router.get("/profile/{user_id}")
async def get_profile(user_id: str, user=Depends(get_current_user)):
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")
    profile = (
        supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    )
    prefs = (
        supabase.table("reminder_preferences")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    return {**profile.data, "preferences": prefs.data[0] if prefs.data else {}}


@router.put("/profile/{user_id}")
async def update_profile(user_id: str, req: ProfileUpdate, user=Depends(get_current_user)):
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")

    profile_data = {}
    if req.username is not None:
        profile_data["username"] = req.username
    if req.avatar_url is not None:
        profile_data["avatar_url"] = req.avatar_url
    if profile_data:
        supabase.table("profiles").update(profile_data).eq("id", user_id).execute()

    pref_data = {}
    if req.reminder_time is not None:
        pref_data["reminder_time"] = req.reminder_time
    if req.timezone is not None:
        pref_data["timezone"] = req.timezone
    if req.reminders_enabled is not None:
        pref_data["enabled"] = req.reminders_enabled
    if req.fcm_token is not None:
        pref_data["fcm_token"] = req.fcm_token
    if pref_data:
        supabase.table("reminder_preferences").update(pref_data).eq("user_id", user_id).execute()

    return {"ok": True}


@router.put("/push-token")
async def update_push_token(body: dict, user=Depends(get_current_user)):
    token = body.get("fcm_token")
    if not token:
        raise HTTPException(400, "fcm_token required")
    supabase.table("reminder_preferences").update({"fcm_token": token}).eq(
        "user_id", user.id
    ).execute()
    return {"ok": True}
