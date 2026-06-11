from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import supabase
from redis_client import r
from middleware.auth import get_current_user

router = APIRouter()

JURY_MIN_VOTES = 3


class VoteRequest(BaseModel):
    vote: bool


@router.post("/{checkin_id}/vote")
async def cast_vote(checkin_id: str, req: VoteRequest, user=Depends(get_current_user)):
    checkin = (
        supabase.table("checkins")
        .select("id, user_id, battle_id, ai_verified, date")
        .eq("id", checkin_id)
        .single()
        .execute()
        .data
    )
    if not checkin:
        raise HTTPException(404, "Checkin not found")
    if checkin["ai_verified"] is not None:
        raise HTTPException(400, "This checkin has already been resolved")
    if checkin["user_id"] == user.id:
        raise HTTPException(403, "Cannot vote on your own checkin")

    membership = (
        supabase.table("battle_members")
        .select("id")
        .eq("battle_id", checkin["battle_id"])
        .eq("user_id", user.id)
        .eq("status", "active")
        .execute()
    )
    if not membership.data:
        raise HTTPException(403, "Only active members can vote")

    try:
        supabase.table("jury_votes").insert({
            "checkin_id": checkin_id,
            "voter_id": user.id,
            "vote": req.vote,
        }).execute()
    except Exception:
        raise HTTPException(409, "You already voted on this checkin")

    votes = (
        supabase.table("jury_votes")
        .select("vote")
        .eq("checkin_id", checkin_id)
        .execute()
        .data
    )
    total = len(votes)
    approvals = sum(1 for v in votes if v["vote"])

    member_count = (
        supabase.table("battle_members")
        .select("id", count="exact")
        .eq("battle_id", checkin["battle_id"])
        .eq("status", "active")
        .execute()
    )
    eligible = (member_count.count or 1) - 1

    resolved = False
    verdict = None

    if total >= JURY_MIN_VOTES or total >= eligible:
        verdict = approvals > (total / 2)
        resolved = True

    if resolved:
        supabase.table("checkins").update({"ai_verified": verdict}).eq("id", checkin_id).execute()
        r.delete(f"battle:{checkin['battle_id']}:members")

        if verdict:
            today = checkin["date"]
            checkin_key = f"battle:{checkin['battle_id']}:checkedin:{today}"
            r.sadd(checkin_key, checkin["user_id"])
            r.expire(checkin_key, 172800)

            streak_key = f"battle:{checkin['battle_id']}:streak:{checkin['user_id']}"
            new_streak = r.incr(streak_key)

            current = (
                supabase.table("battle_members")
                .select("longest_streak, freeze_tokens")
                .eq("battle_id", checkin["battle_id"])
                .eq("user_id", checkin["user_id"])
                .single()
                .execute()
                .data
            )
            longest = max(int(new_streak), current["longest_streak"])
            update_data = {"current_streak": int(new_streak), "longest_streak": longest}
            if int(new_streak) % 7 == 0:
                update_data["freeze_tokens"] = (current.get("freeze_tokens") or 0) + 1
            supabase.table("battle_members").update(update_data).eq(
                "battle_id", checkin["battle_id"]
            ).eq("user_id", checkin["user_id"]).execute()
            r.delete(f"leaderboard:battle:{checkin['battle_id']}")

    return {"voted": True, "total_votes": total, "resolved": resolved, "verdict": verdict}


@router.get("/{checkin_id}/votes")
async def get_votes(checkin_id: str, user=Depends(get_current_user)):
    checkin = (
        supabase.table("checkins")
        .select("battle_id, ai_verified")
        .eq("id", checkin_id)
        .single()
        .execute()
        .data
    )
    if not checkin:
        raise HTTPException(404, "Checkin not found")

    membership = (
        supabase.table("battle_members")
        .select("id")
        .eq("battle_id", checkin["battle_id"])
        .eq("user_id", user.id)
        .eq("status", "active")
        .execute()
    )
    if not membership.data:
        raise HTTPException(403, "Members only")

    votes = (
        supabase.table("jury_votes")
        .select("vote, created_at")
        .eq("checkin_id", checkin_id)
        .execute()
        .data
    )
    approvals = sum(1 for v in votes if v["vote"])

    my_vote_res = (
        supabase.table("jury_votes")
        .select("vote")
        .eq("checkin_id", checkin_id)
        .eq("voter_id", user.id)
        .execute()
        .data
    )

    return {
        "total": len(votes),
        "approvals": approvals,
        "resolved": checkin["ai_verified"] is not None,
        "verdict": checkin["ai_verified"],
        "my_vote": my_vote_res[0]["vote"] if my_vote_res else None,
    }
