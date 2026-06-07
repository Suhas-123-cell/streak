from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import supabase
from middleware.auth import get_current_user

router = APIRouter()


class CreateBattleRequest(BaseModel):
    habit_name: str
    habit_description: Optional[str] = None
    ends_at: Optional[str] = None
    member_usernames: List[str] = []


@router.post("")
async def create_battle(req: CreateBattleRequest, user=Depends(get_current_user)):
    battle = (
        supabase.table("battles")
        .insert(
            {
                "created_by": user.id,
                "habit_name": req.habit_name,
                "habit_description": req.habit_description,
                "ends_at": req.ends_at,
            }
        )
        .execute()
        .data[0]
    )

    supabase.table("battle_members").insert(
        {"battle_id": battle["id"], "user_id": user.id, "status": "active"}
    ).execute()

    for username in req.member_usernames:
        res = (
            supabase.table("profiles")
            .select("id")
            .eq("username", username)
            .execute()
        )
        if res.data:
            supabase.table("battle_members").insert(
                {
                    "battle_id": battle["id"],
                    "user_id": res.data[0]["id"],
                    "status": "pending",
                }
            ).execute()

    return battle


@router.get("/user/{user_id}")
async def get_user_battles(user_id: str, user=Depends(get_current_user)):
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")
    memberships = (
        supabase.table("battle_members")
        .select("battle_id")
        .eq("user_id", user_id)
        .in_("status", ["active", "pending"])
        .execute()
        .data
    )
    ids = [m["battle_id"] for m in memberships]
    if not ids:
        return []
    return supabase.table("battles").select("*").in_("id", ids).execute().data


@router.get("/{battle_id}")
async def get_battle(battle_id: str, user=Depends(get_current_user)):
    battle = (
        supabase.table("battles").select("*").eq("id", battle_id).single().execute()
    )
    return battle.data


@router.delete("/{battle_id}")
async def delete_battle(battle_id: str, user=Depends(get_current_user)):
    row = (
        supabase.table("battles")
        .select("created_by")
        .eq("id", battle_id)
        .single()
        .execute()
    )
    if row.data["created_by"] != user.id:
        raise HTTPException(403, "Only the creator can delete this battle")
    supabase.table("battles").delete().eq("id", battle_id).execute()
    return {"ok": True}
