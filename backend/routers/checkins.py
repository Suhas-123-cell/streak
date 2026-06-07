import os
import tempfile
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from database import supabase
from redis_client import r
from middleware.auth import get_current_user
from services.gemini_verifier import verify_photo, verify_voice
from services.transcriber import transcribe_audio
from extensions import limiter

router = APIRouter()

SCORE_THRESHOLD = 60
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"}
ALLOWED_PROOF_TYPES = {"photo", "voice"}

PHOTO_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
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
    if proof_type == "photo" and content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(400, "Invalid file type for photo proof")
    if proof_type == "voice" and content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(400, "Invalid file type for voice proof")

    raw_name = proof_file.filename or ""
    raw_ext = raw_name.rsplit(".", 1)[-1].lower() if "." in raw_name else ""
    allowed_exts = PHOTO_EXTENSIONS if proof_type == "photo" else AUDIO_EXTENSIONS
    ext = raw_ext if raw_ext in allowed_exts else ("jpg" if proof_type == "photo" else "mp3")

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

    battle = (
        supabase.table("battles")
        .select("habit_name, habit_description")
        .eq("id", battle_id)
        .single()
        .execute()
        .data
    )

    content = await proof_file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 10 MB)")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        if proof_type == "photo":
            result = verify_photo(tmp_path, battle["habit_name"], battle["habit_description"])
        else:
            transcript = transcribe_audio(tmp_path)
            result = verify_voice(transcript, battle["habit_name"], battle["habit_description"])
    finally:
        os.unlink(tmp_path)

    verified = result["verified"] and result["score"] >= SCORE_THRESHOLD

    storage_path = f"checkins/{battle_id}/{user.id}/{today}.{ext}"
    supabase.storage.from_("proofs").upload(storage_path, content)
    proof_url = supabase.storage.from_("proofs").get_public_url(storage_path)

    checkin = (
        supabase.table("checkins")
        .insert(
            {
                "battle_id": battle_id,
                "user_id": user.id,
                "proof_type": proof_type,
                "proof_url": proof_url,
                "ai_verified": verified,
                "ai_score": result["score"],
                "ai_reasoning": result["reasoning"],
                "date": today,
            }
        )
        .execute()
        .data[0]
    )

    if verified:
        r.sadd(checkin_key, user.id)
        r.expire(checkin_key, 172800)

        streak_key = f"battle:{battle_id}:streak:{user.id}"
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
        longest = max(int(new_streak), current["longest_streak"])
        supabase.table("battle_members").update(
            {"current_streak": int(new_streak), "longest_streak": longest}
        ).eq("battle_id", battle_id).eq("user_id", user.id).execute()

        r.delete(f"battle:{battle_id}:members")
        r.delete(f"leaderboard:battle:{battle_id}")

    return checkin


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
