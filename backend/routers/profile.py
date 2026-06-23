from typing import Any, Optional, cast

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
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
    return {**cast(dict[str, Any], profile.data), "preferences": prefs.data[0] if prefs.data else {}}


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

    pref_data: dict[str, Any] = {}
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
    supabase.table("reminder_preferences").upsert(
        {"user_id": user.id, "fcm_token": token}
    ).execute()
    return {"ok": True}


class ReminderPrefsRequest(BaseModel):
    enabled: bool
    reminder_time: str = "21:00"
    fcm_token: Optional[str] = None
    timezone: str = "UTC"


@router.get("/reminder")
async def get_reminder_prefs(user=Depends(get_current_user)):
    result = supabase.table("reminder_preferences").select("*").eq("user_id", user.id).single().execute()
    return result.data or {}


@router.put("/reminder")
async def update_reminder_prefs(req: ReminderPrefsRequest, user=Depends(get_current_user)):
    data = {
        "user_id": user.id,
        "enabled": req.enabled,
        "reminder_time": req.reminder_time,
        "timezone": req.timezone,
    }
    if req.fcm_token:
        data["fcm_token"] = req.fcm_token

    supabase.table("reminder_preferences").upsert(data).execute()
    return {"ok": True}


class FCMTokenRequest(BaseModel):
    fcm_token: str


@router.put("/fcm-token")
async def update_fcm_token(req: FCMTokenRequest, user=Depends(get_current_user)):
    supabase.table("reminder_preferences").update({"fcm_token": req.fcm_token}).eq("user_id", user.id).execute()
    return {"ok": True}
