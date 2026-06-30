import logging
from typing import cast
import os
import tempfile
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from database import supabase
from redis_client import r
from middleware.auth import get_current_user
from services.gemini_verifier import verify_photo, verify_voice, verify_video
from services.transcriber import transcribe_audio
from extensions import limiter

router = APIRouter()

SCORE_THRESHOLD = 60
JURY_THRESHOLD_LOW = 30  # below this = auto-fail; 30–59 = pending jury
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"}
ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/mp4", "audio/m4a", "audio/wav", "audio/ogg", "audio/webm"}
ALLOWED_PROOF_TYPES = {"photo", "voice", "video"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/3gpp"}
VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "webm", "3gp"}

PHOTO_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "heic", "heif"}
AUDIO_EXTENSIONS = {"mp3", "mp4", "m4a", "wav", "ogg", "webm"}


@router.post("")
@limiter.limit("3/minute")
async def submit_checkin(
    request: Request,
    battle_id: str = Form(...),
    proof_type: str = Form(...),
    proof_file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    if proof_type not in ALLOWED_PROOF_TYPES:
        raise HTTPException(400, "proof_type must be 'photo' or 'voice'")

    content_type = proof_file.content_type or ""
    if proof_type == "photo":
        if not content_type:
            # iOS sometimes omits content-type; treat as JPEG so valid uploads aren't rejected
            content_type = "image/jpeg"
        if content_type not in ALLOWED_PHOTO_TYPES:
            raise HTTPException(400, "Invalid file type for photo proof")
    if proof_type == "voice" and content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(400, "Invalid file type for voice proof")
    if proof_type == "video" and content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(400, "Invalid file type for video proof")

    raw_name = proof_file.filename or ""
    raw_ext = raw_name.rsplit(".", 1)[-1].lower() if "." in raw_name else ""
    if proof_type == "photo":
        allowed_exts, default_ext = PHOTO_EXTENSIONS, "jpg"
    elif proof_type == "video":
        allowed_exts, default_ext = VIDEO_EXTENSIONS, "mp4"
    else:
        allowed_exts, default_ext = AUDIO_EXTENSIONS, "mp3"
    ext = raw_ext if raw_ext in allowed_exts else default_ext

    today = date.today().isoformat()
    checkin_key = f"battle:{battle_id}:checkedin:{today}"

    if r.sismember(checkin_key, user.id):
        raise HTTPException(400, "Already checked in today")

    membership = (
        supabase.table("battle_members")
        .select("id")
        .eq("battle_id", battle_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .execute()
    )
    if not membership.data:
        raise HTTPException(403, "You are not an active member of this battle")

    battle = cast(dict, (
        supabase.table("battles")
        .select("habit_name, habit_description")
        .eq("id", battle_id)
        .single()
        .execute()
        .data
    ))

    content = await proof_file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 10 MB)")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        if proof_type == "photo":
            result = verify_photo(tmp_path, battle["habit_name"], battle["habit_description"])
        elif proof_type == "video":
            result = verify_video(tmp_path, battle["habit_name"], battle["habit_description"])
        else:
            transcript = transcribe_audio(tmp_path)
            result = verify_voice(transcript, battle["habit_name"], battle["habit_description"])
    except Exception as e:
        logging.error(f"AI verification failed: {e}")
        raise HTTPException(503, f"AI verification temporarily unavailable: {str(e)[:100]}")
    finally:
        os.unlink(tmp_path)

    score = result["score"]
    if score >= SCORE_THRESHOLD:
        verified = result["verified"]
        ai_verified_value = verified
    elif score >= JURY_THRESHOLD_LOW:
        verified = False
        ai_verified_value = None  # pending jury vote
    else:
        verified = False
        ai_verified_value = False

    try:
        storage_path = f"checkins/{battle_id}/{user.id}/{today}.{ext}"
        supabase.storage.from_("proofs").upload(storage_path, content, {"upsert": "true"})
        proof_url = supabase.storage.from_("proofs").get_public_url(storage_path)
    except Exception as e:
        logging.error(f"Storage upload failed: {e}")
        proof_url = ""  # proceed without URL

    checkin = (
        supabase.table("checkins")
        .insert(
            {
                "battle_id": battle_id,
                "user_id": user.id,
                "proof_type": proof_type,
                "proof_url": proof_url,
                "ai_verified": ai_verified_value,
                "ai_score": result["score"],
                "ai_reasoning": result["reasoning"],
                "date": today,
            }
        )
        .execute()
        .data[0]
    )

    # Always bust the member cache so checked_in_today refreshes immediately
    r.delete(f"battle:{battle_id}:members")

    # Block re-submission for any outcome (verified, pending jury, or failed)
    r.sadd(checkin_key, user.id)
    r.expire(checkin_key, 172800)

    milestone_hit = None
    new_rank = None

    if verified:
        streak_key = f"battle:{battle_id}:streak:{user.id}"
        # Seed from DB if Redis key expired to avoid resetting a real streak to 1
        if not r.exists(streak_key):
            seed = cast(dict, supabase.table("battle_members").select("current_streak")
                    .eq("battle_id", battle_id).eq("user_id", user.id)
                    .single().execute().data or {}).get("current_streak", 0)
            r.set(streak_key, seed)
        new_streak = r.incr(streak_key)

        current = cast(dict, (
            supabase.table("battle_members")
            .select("longest_streak, freeze_tokens")
            .eq("battle_id", battle_id)
            .eq("user_id", user.id)
            .single()
            .execute()
            .data
        ))
        longest = max(new_streak, current["longest_streak"])
        update_data: dict = {"current_streak": new_streak, "longest_streak": longest}
        if new_streak % 7 == 0:
            update_data["freeze_tokens"] = (current.get("freeze_tokens") or 0) + 1
        supabase.table("battle_members").update(update_data).eq(
            "battle_id", battle_id
        ).eq("user_id", user.id).execute()

        r.delete(f"leaderboard:battle:{battle_id}")

        if new_streak in {7, 14, 21, 30, 50, 100}:
            milestone_hit = new_streak
            new_rank = _rank_from_streak(new_streak)

    return {**cast(dict, checkin), "milestone_hit": milestone_hit, "new_rank": new_rank}


_RANK_THRESHOLDS = [(100, "GRANDMASTER"), (50, "LEGEND"), (30, "CHAMPION"), (7, "FIGHTER"), (0, "ROOKIE")]


def _rank_from_streak(streak: int) -> str:
    for threshold, rank in _RANK_THRESHOLDS:
        if streak >= threshold:
            return rank
    return "ROOKIE"


@router.get("/{battle_id}")
async def list_checkins(battle_id: str, page: int = 0, user=Depends(get_current_user)):
    checkins = (
        supabase.table("checkins")
        .select("*, profiles(username, avatar_url)")
        .eq("battle_id", battle_id)
        .order("checked_in_at", desc=True)
        .range(page * 20, page * 20 + 19)
        .execute()
    )
    return checkins.data


ALLOWED_REACTIONS = {"🔥", "❤️", "👏", "💪", "😤"}


@router.post("/{checkin_id}/react")
async def react_to_checkin(checkin_id: str, body: dict, user=Depends(get_current_user)):
    emoji = body.get("emoji", "🔥")
    if emoji not in ALLOWED_REACTIONS:
        raise HTTPException(400, f"Emoji must be one of: {', '.join(ALLOWED_REACTIONS)}")
    supabase.table("checkin_reactions").upsert({
        "checkin_id": checkin_id,
        "user_id": user.id,
        "emoji": emoji,
    }, on_conflict="checkin_id,user_id").execute()
    counts = (
        supabase.table("checkin_reactions")
        .select("emoji")
        .eq("checkin_id", checkin_id)
        .execute()
    )
    from collections import Counter
    tally = dict(Counter(r["emoji"] for r in (counts.data or [])))
    return {"ok": True, "reactions": tally}


@router.get("/{battle_id}/today")
async def today_checkins(battle_id: str, user=Depends(get_current_user)):
    today = date.today().isoformat()
    checkins = (
        supabase.table("checkins")
        .select("*, profiles(username, avatar_url)")
        .eq("battle_id", battle_id)
        .eq("date", today)
        .execute()
    )
    return checkins.data
