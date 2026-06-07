from datetime import date, timedelta
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
        .select("assigned_to")
        .eq("id", penalty_id)
        .single()
        .execute()
        .data
    )
    if penalty["assigned_to"] != user.id:
        raise HTTPException(403, "Only the penalised member can mark it done")
    supabase.table("penalties").update({"completed": True}).eq("id", penalty_id).execute()
    return {"ok": True}


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
