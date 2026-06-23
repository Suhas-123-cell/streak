from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from database import supabase
from middleware.auth import get_current_user

router = APIRouter()

_RANK_THRESHOLDS = [(100, "GRANDMASTER"), (50, "LEGEND"), (30, "CHAMPION"), (7, "FIGHTER"), (0, "ROOKIE")]
_RANK_COMBO = {"ROOKIE": 1, "FIGHTER": 3, "CHAMPION": 6, "LEGEND": 9, "GRANDMASTER": 12}


def _rank_from_streak(streak: int) -> str:
    for threshold, rank in _RANK_THRESHOLDS:
        if streak >= threshold:
            return rank
    return "ROOKIE"


@router.get("/stats/{user_id}")
async def get_reward_stats(user_id: str, user=Depends(get_current_user)):
    profile: dict[str, Any] = cast(
        dict[str, Any],
        supabase.table("profiles")
        .select("longest_streak, fighter_color")
        .eq("id", user_id)
        .single()
        .execute()
        .data,
    )
    if not profile:
        raise HTTPException(404, "Profile not found")

    longest: int = profile.get("longest_streak") or 0
    rank = _rank_from_streak(longest)
    combo = _RANK_COMBO.get(rank, 1)

    members: list[dict[str, Any]] = cast(
        list[dict[str, Any]],
        supabase.table("battle_members")
        .select("current_streak")
        .eq("user_id", user_id)
        .eq("status", "active")
        .execute()
        .data,
    )
    active_streak = max((int(m["current_streak"] or 0) for m in members), default=0)

    return {
        "longest_streak": longest,
        "active_streak": active_streak,
        "rank": rank,
        "combo_multiplier": combo,
        "fighter_color": profile.get("fighter_color") or "pink",
    }

