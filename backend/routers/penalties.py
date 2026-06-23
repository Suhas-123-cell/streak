from datetime import date, timedelta
from typing import Any, Dict, cast
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import supabase
from redis_client import r
from middleware.auth import get_current_user

router = APIRouter()


class CreatePenaltyRequest(BaseModel):
    battle_id: str
    assigned_to: str
    penalty_text: str


@router.post("")
async def assign_penalty(req: CreatePenaltyRequest, user=Depends(get_current_user)):
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    today = date.today().isoformat()
    checkin_key = f"battle:{req.battle_id}:checkedin:{today}"

    if not r.sismember(checkin_key, user.id):
        yesterday_key = f"battle:{req.battle_id}:checkedin:{yesterday}"
        if not r.sismember(yesterday_key, user.id):
            raise HTTPException(403, "Only members who checked in can assign penalties")

    target = (
        supabase.table("battle_members")
        .select("id")
        .eq("battle_id", req.battle_id)
        .eq("user_id", req.assigned_to)
        .eq("status", "active")
        .execute()
    )
    if not target.data:
        raise HTTPException(400, "Target user is not an active member of this battle")

    penalty = (
        supabase.table("penalties")
        .insert(
            {
                "battle_id": req.battle_id,
                "assigned_by": user.id,
                "assigned_to": req.assigned_to,
                "penalty_text": req.penalty_text,
            }
        )
        .execute()
        .data[0]
    )
    return penalty


@router.put("/{penalty_id}/done")
async def mark_done(penalty_id: str, user=Depends(get_current_user)):
    penalty = (
        supabase.table("penalties")
        .select("assigned_to, battle_id, completed")
        .eq("id", penalty_id)
        .single()
        .execute()
        .data
    )
    if not penalty:
        raise HTTPException(404, "Penalty not found")
    penalty = cast(Dict[str, Any], penalty)
    if penalty["assigned_to"] != user.id:
        raise HTTPException(403, "Only the penalised member can mark it done")
    if penalty["completed"]:
        return {"ok": True, "streak_repaired": False}
    supabase.table("penalties").update({"completed": True}).eq("id", penalty_id).execute()

    # Redemption: restore 1 streak day when challenge completed
    battle_id = penalty["battle_id"]
    streak_key = f"battle:{battle_id}:streak:{user.id}"
    if not r.exists(streak_key):
        seed_row = (supabase.table("battle_members").select("current_streak")
                .eq("battle_id", battle_id).eq("user_id", user.id)
                .single().execute().data)
        seed = cast(Dict[str, Any], seed_row).get("current_streak", 0) if seed_row else 0
        r.set(streak_key, int(seed))
    new_streak = r.incr(streak_key)
    current = (
        supabase.table("battle_members")
        .select("longest_streak")
        .eq("battle_id", battle_id)
        .eq("user_id", user.id)
        .single()
        .execute()
        .data
    )
    current = cast(Dict[str, Any], current) if current else {}
    longest = max(new_streak, int(current.get("longest_streak", 0)))
    supabase.table("battle_members").update(
        {"current_streak": new_streak, "longest_streak": longest}
    ).eq("battle_id", battle_id).eq("user_id", user.id).execute()
    r.delete(f"battle:{battle_id}:members")
    r.delete(f"leaderboard:battle:{battle_id}")

    return {"ok": True, "streak_repaired": True, "new_streak": new_streak}


@router.get("/{battle_id}")
async def list_penalties(battle_id: str, user=Depends(get_current_user)):
    penalties = (
        supabase.table("penalties")
        .select("*, assigner:assigned_by(username), assignee:assigned_to(username)")
        .eq("battle_id", battle_id)
        .order("created_at", desc=True)
        .execute()
    )
    return penalties.data
