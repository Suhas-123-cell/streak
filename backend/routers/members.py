import json
import random
import string
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, cast
from datetime import date
from database import supabase
from redis_client import r
from middleware.auth import get_current_user

router = APIRouter()


def _generate_code(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


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
        uid = cast(Dict[str, Any], res.data[0])["id"]
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
    checked_in_ids = {cast(Dict[str, Any], c)["user_id"] for c in today_checkins}

    result = []
    for m in members:
        member_row = cast(Dict[str, Any], m)
        uid = member_row["user_id"]
        streak = int(r.get(f"battle:{battle_id}:streak:{uid}") or member_row["current_streak"])
        result.append(
            {
                **member_row,
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
    member = cast(Dict[str, Any], member)
    if (member.get("freeze_tokens") or 0) < 1:
        raise HTTPException(400, "No freeze tokens available")

    today = date.today().isoformat()
    checkin_key = f"battle:{battle_id}:checkedin:{today}"
    if r.sismember(checkin_key, user.id):
        raise HTTPException(400, "Already checked in today — no freeze needed")

    # Use the token: protect streak for today
    new_tokens = int(member["freeze_tokens"] or 0) - 1
    streak_key = f"battle:{battle_id}:streak:{user.id}"
    if not r.exists(streak_key):
        r.set(streak_key, int(member["current_streak"] or 0))
    new_streak = r.incr(streak_key)
    longest = max(new_streak, int(member["longest_streak"] or 0))

    supabase.table("battle_members").update({
        "freeze_tokens": new_tokens,
        "current_streak": new_streak,
        "longest_streak": longest,
    }).eq("battle_id", battle_id).eq("user_id", user.id).execute()

    r.sadd(checkin_key, user.id)
    r.expire(checkin_key, 172800)
    _invalidate_member_cache(battle_id)

    return {"ok": True, "freeze_tokens_remaining": new_tokens, "current_streak": new_streak}


# ── Invite codes ──────────────────────────────────────────────────────

@router.post("/{battle_id}/invite-link")
async def create_invite_link(battle_id: str, user=Depends(get_current_user)):
    membership = (
        supabase.table("battle_members")
        .select("id")
        .eq("battle_id", battle_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .execute()
    )
    if not membership.data:
        raise HTTPException(403, "Only active members can create invite links")

    # Re-use an existing active code if available
    existing = (
        supabase.table("invite_codes")
        .select("code, expires_at")
        .eq("battle_id", battle_id)
        .eq("created_by", user.id)
        .execute()
    )
    if existing.data:
        from datetime import datetime, timezone
        row = cast(Dict[str, Any], existing.data[0])
        exp = row.get("expires_at", "")
        if exp and datetime.fromisoformat(exp.replace("Z", "+00:00")) > datetime.now(timezone.utc):
            return {"code": row["code"]}

    # Generate unique code
    for _ in range(10):
        code = _generate_code()
        check = supabase.table("invite_codes").select("id").eq("code", code).execute()
        if not check.data:
            break

    supabase.table("invite_codes").insert({
        "battle_id": battle_id,
        "created_by": user.id,
        "code": code,
    }).execute()
    return {"code": code}


@router.get("/invite/{code}")
async def get_invite_info(code: str, user=Depends(get_current_user)):
    row = supabase.table("invite_codes").select("*").eq("code", code.upper()).execute()
    if not row.data:
        raise HTTPException(404, "Invalid or expired invite code")
    invite = cast(Dict[str, Any], row.data[0])

    from datetime import datetime, timezone
    exp = invite.get("expires_at", "")
    if exp and datetime.fromisoformat(exp.replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(410, "Invite code expired")
    if invite.get("uses_count", 0) >= invite.get("max_uses", 50):
        raise HTTPException(410, "Invite code has reached its limit")

    battle = supabase.table("battles").select("id, habit_name, habit_description").eq(
        "id", invite["battle_id"]
    ).single().execute()
    if not battle.data:
        raise HTTPException(404, "Battle not found")

    member_count = (
        supabase.table("battle_members")
        .select("id", count="exact")  # pyrefly: ignore
        .eq("battle_id", invite["battle_id"])
        .eq("status", "active")
        .execute()
    )

    return {
        "battle": battle.data,
        "member_count": member_count.count or 0,
        "code": code.upper(),
    }


@router.post("/invite/{code}/join")
async def join_via_code(code: str, user=Depends(get_current_user)):
    row = supabase.table("invite_codes").select("*").eq("code", code.upper()).execute()
    if not row.data:
        raise HTTPException(404, "Invalid invite code")
    invite = cast(Dict[str, Any], row.data[0])

    from datetime import datetime, timezone
    exp = invite.get("expires_at", "")
    if exp and datetime.fromisoformat(exp.replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(410, "Invite code expired")
    if invite.get("uses_count", 0) >= invite.get("max_uses", 50):
        raise HTTPException(410, "Invite code limit reached")

    battle_id = invite["battle_id"]
    existing = (
        supabase.table("battle_members")
        .select("id, status")
        .eq("battle_id", battle_id)
        .eq("user_id", user.id)
        .execute()
    )
    if existing.data:
        m = cast(Dict[str, Any], existing.data[0])
        if m["status"] == "active":
            raise HTTPException(409, "Already a member of this battle")
        # Reactivate pending/declined
        supabase.table("battle_members").update({"status": "active"}).eq(
            "id", m["id"]
        ).execute()
    else:
        supabase.table("battle_members").insert({
            "battle_id": battle_id,
            "user_id": user.id,
            "status": "active",
        }).execute()

    supabase.table("invite_codes").update({"uses_count": invite.get("uses_count", 0) + 1}).eq(
        "code", code.upper()
    ).execute()
    _invalidate_member_cache(battle_id)
    return {"ok": True, "battle_id": battle_id}
