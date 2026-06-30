from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional, cast
from database import supabase
from middleware.auth import get_current_user
from routers.subscription import is_pro, FREE_BATTLE_LIMIT

router = APIRouter()


class CreateBattleRequest(BaseModel):
    habit_name: str
    habit_description: Optional[str] = None
    ends_at: Optional[str] = None
    member_usernames: List[str] = []


@router.post("")
async def create_battle(req: CreateBattleRequest, user=Depends(get_current_user)):
    if not is_pro(user.id):
        active = (
            supabase.table("battle_members")
            .select("id", count="exact")  # pyrefly: ignore
            .eq("user_id", user.id)
            .eq("status", "active")
            .execute()
        )
        if (active.count or 0) >= FREE_BATTLE_LIMIT:
            raise HTTPException(
                403,
                f"Free tier is limited to {FREE_BATTLE_LIMIT} active battles. Upgrade to Pro for unlimited battles."
            )

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
    battle = cast(Dict[str, Any], battle)

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
            profile = cast(Dict[str, Any], res.data[0])
            supabase.table("battle_members").insert(
                {
                    "battle_id": battle["id"],
                    "user_id": profile["id"],
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
    ids = [cast(Dict[str, Any], m)["battle_id"] for m in memberships]
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
    data = cast(Dict[str, Any], row.data)
    if data["created_by"] != user.id:
        raise HTTPException(403, "Only the creator can delete this battle")
    supabase.table("battles").delete().eq("id", battle_id).execute()
    return {"ok": True}


@router.post("/{battle_id}/repair-streak")
async def repair_streak(battle_id: str, user=Depends(get_current_user)):
    member = cast(Dict[str, Any], (
        supabase.table("battle_members")
        .select("current_streak, freeze_tokens, status")
        .eq("battle_id", battle_id)
        .eq("user_id", user.id)
        .single()
        .execute()
        .data
    ))
    if not member or member.get("status") != "active":
        raise HTTPException(403, "Not an active member of this battle")
    tokens = member.get("freeze_tokens") or 0
    if tokens < 1:
        raise HTTPException(400, "No freeze tokens available")
    new_streak = (member.get("current_streak") or 0) + 1
    supabase.table("battle_members").update({
        "current_streak": new_streak,
        "freeze_tokens": tokens - 1,
    }).eq("battle_id", battle_id).eq("user_id", user.id).execute()
    return {"ok": True, "new_streak": new_streak, "tokens_remaining": tokens - 1}


POKE_MESSAGES = [
    "{name} is watching. Don't let them win. 👀",
    "{name} already checked in and is judging you right now. 😤",
    "{name} called you out. What are you doing? 🔥",
    "Your excuse better be good. {name} wants to see your proof. 💪",
]


@router.post("/{battle_id}/poke/{target_user_id}")
async def poke_member(battle_id: str, target_user_id: str, user=Depends(get_current_user)):
    if user.id == target_user_id:
        raise HTTPException(400, "Cannot poke yourself")
    memberships = (
        supabase.table("battle_members")
        .select("user_id")
        .eq("battle_id", battle_id)
        .in_("user_id", [user.id, target_user_id])
        .eq("status", "active")
        .execute()
    )
    if len(memberships.data or []) < 2:
        raise HTTPException(403, "Both users must be active members of this battle")
    poker = supabase.table("profiles").select("username").eq("id", user.id).single().execute()
    poker_name = (poker.data or {}).get("username") or "Someone"
    pref = supabase.table("reminder_preferences").select("fcm_token").eq("user_id", target_user_id).single().execute()
    fcm_token = (pref.data or {}).get("fcm_token")
    if fcm_token:
        import random
        from tasks import _send_fcm
        body = random.choice(POKE_MESSAGES).format(name=poker_name)
        _send_fcm(str(fcm_token), "👊 You've been poked", body)
    return {"ok": True}


@router.post("/{battle_id}/leave")
async def leave_battle(battle_id: str, user=Depends(get_current_user)):
    member = (
        supabase.table("battle_members")
        .select("id")
        .eq("battle_id", battle_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not member.data:
        raise HTTPException(404, "Not a member of this battle")
    supabase.table("battle_members").update({"status": "left"}).eq(
        "battle_id", battle_id
    ).eq("user_id", user.id).execute()
    return {"ok": True}
