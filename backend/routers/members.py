import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import date
from database import supabase
from redis_client import r
from middleware.auth import get_current_user

router = APIRouter()


class InviteRequest(BaseModel):
    usernames: List[str]


def _invalidate_member_cache(battle_id: str):
    r.delete(f"battle:{battle_id}:members")


@router.post("/{battle_id}/invite")
async def invite_members(battle_id: str, req: InviteRequest, user=Depends(get_current_user)):
    for username in req.usernames:
        res = supabase.table("profiles").select("id").eq("username", username).execute()
        if not res.data:
            continue
        uid = res.data[0]["id"]
        existing = (
            supabase.table("battle_members")
            .select("id")
            .eq("battle_id", battle_id)
            .eq("user_id", uid)
            .execute()
        )
        if not existing.data:
            supabase.table("battle_members").insert(
                {"battle_id": battle_id, "user_id": uid, "status": "pending"}
            ).execute()
    _invalidate_member_cache(battle_id)
    return {"ok": True}


@router.put("/{battle_id}/accept")
async def accept_invite(battle_id: str, user=Depends(get_current_user)):
    supabase.table("battle_members").update({"status": "active"}).eq(
        "battle_id", battle_id
    ).eq("user_id", user.id).execute()
    _invalidate_member_cache(battle_id)
    return {"ok": True}


@router.put("/{battle_id}/decline")
async def decline_invite(battle_id: str, user=Depends(get_current_user)):
    supabase.table("battle_members").update({"status": "declined"}).eq(
        "battle_id", battle_id
    ).eq("user_id", user.id).execute()
    _invalidate_member_cache(battle_id)
    return {"ok": True}


@router.delete("/{battle_id}/leave")
async def leave_battle(battle_id: str, user=Depends(get_current_user)):
    supabase.table("battle_members").delete().eq("battle_id", battle_id).eq(
        "user_id", user.id
    ).execute()
    _invalidate_member_cache(battle_id)
    return {"ok": True}


@router.get("/{battle_id}/members")
async def get_members(battle_id: str, user=Depends(get_current_user)):
    cache_key = f"battle:{battle_id}:members"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    members = (
        supabase.table("battle_members")
        .select("*, profiles(id, username, avatar_url)")
        .eq("battle_id", battle_id)
        .eq("status", "active")
        .execute()
        .data
    )

    today = date.today().isoformat()
    checkin_key = f"battle:{battle_id}:checkedin:{today}"
    checked_in_ids = r.smembers(checkin_key)

    result = []
    for m in members:
        uid = m["user_id"]
        streak = int(r.get(f"battle:{battle_id}:streak:{uid}") or m["current_streak"])
        result.append(
            {
                **m,
                "current_streak": streak,
                "checked_in_today": uid in checked_in_ids,
            }
        )

    result.sort(key=lambda x: x["current_streak"], reverse=True)
    r.setex(cache_key, 300, json.dumps(result))
    return result
