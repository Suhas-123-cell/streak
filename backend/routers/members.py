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
    # Use DB so any submission (verified or not) marks member as checked in
    today_checkins = (
        supabase.table("checkins")
        .select("user_id")
        .eq("battle_id", battle_id)
        .eq("date", today)
        .execute()
        .data
    )
    checked_in_ids = {c["user_id"] for c in today_checkins}

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


@router.post("/{battle_id}/freeze")
async def use_freeze(battle_id: str, user=Depends(get_current_user)):
    member = (
        supabase.table("battle_members")
        .select("freeze_tokens, current_streak, longest_streak")
        .eq("battle_id", battle_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()
        .execute()
        .data
    )
    if not member:
        raise HTTPException(403, "Not an active member of this battle")
    if (member.get("freeze_tokens") or 0) < 1:
        raise HTTPException(400, "No freeze tokens available")

    today = date.today().isoformat()
    checkin_key = f"battle:{battle_id}:checkedin:{today}"
    if r.sismember(checkin_key, user.id):
        raise HTTPException(400, "Already checked in today — no freeze needed")

    # Use the token: protect streak for today
    new_tokens = (member["freeze_tokens"] or 0) - 1
    streak_key = f"battle:{battle_id}:streak:{user.id}"
    new_streak = r.incr(streak_key)
    longest = max(int(new_streak), member["longest_streak"])

    supabase.table("battle_members").update({
        "freeze_tokens": new_tokens,
        "current_streak": int(new_streak),
        "longest_streak": longest,
    }).eq("battle_id", battle_id).eq("user_id", user.id).execute()

    r.sadd(checkin_key, user.id)
    r.expire(checkin_key, 172800)
    _invalidate_member_cache(battle_id)

    return {"ok": True, "freeze_tokens_remaining": new_tokens, "current_streak": int(new_streak)}
