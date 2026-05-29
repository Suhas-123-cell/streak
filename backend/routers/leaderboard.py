import json
from fastapi import APIRouter, Depends
from database import supabase
from redis_client import r
from middleware.auth import get_current_user

router = APIRouter()


@router.get("/global")
async def global_leaderboard(user=Depends(get_current_user)):
    cached = r.get("leaderboard:global")
    if cached:
        return json.loads(cached)

    profiles = (
        supabase.table("profiles")
        .select("id, username, avatar_url, total_wins")
        .order("total_wins", desc=True)
        .limit(50)
        .execute()
        .data
    )

    result = []
    for p in profiles:
        members = (
            supabase.table("battle_members")
            .select("current_streak")
            .eq("user_id", p["id"])
            .eq("status", "active")
            .execute()
            .data
        )
        best_streak = max((m["current_streak"] for m in members), default=0)
        result.append({**p, "active_streak": best_streak})

    result.sort(key=lambda x: (x["total_wins"], x["active_streak"]), reverse=True)
    r.setex("leaderboard:global", 600, json.dumps(result))
    return result


@router.get("/{battle_id}")
async def battle_leaderboard(battle_id: str, user=Depends(get_current_user)):
    cache_key = f"leaderboard:battle:{battle_id}"
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    members = (
        supabase.table("battle_members")
        .select("user_id, current_streak, longest_streak, profiles(username, avatar_url)")
        .eq("battle_id", battle_id)
        .eq("status", "active")
        .execute()
        .data
    )

    result = []
    for m in members:
        uid = m["user_id"]
        streak = int(r.get(f"battle:{battle_id}:streak:{uid}") or m["current_streak"])
        result.append({**m, "current_streak": streak})

    result.sort(key=lambda x: x["current_streak"], reverse=True)
    r.setex(cache_key, 300, json.dumps(result))
    return result
