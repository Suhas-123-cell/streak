import random
from typing import cast
import pytz
from datetime import datetime, date
from celery_app import app
from database import supabase
from redis_client import r

REMINDER_MESSAGES = [
    "⚔️ {names} already checked in. You going to let them win?",
    "🔥 {count} people proved it. Still sitting there?",
    "😤 Your {streak}-day streak ends tonight if you don't move.",
    "Everyone's watching. {names} checked in already. What's your excuse?",
]


def _send_fcm(token: str, title: str, body: str):
    import firebase_admin
    from firebase_admin import messaging, credentials
    import os

    if not firebase_admin._apps:
        cred = credentials.Certificate(os.environ["FIREBASE_CREDENTIALS_PATH"])
        firebase_admin.initialize_app(cred)

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=token,
    )
    try:
        messaging.send(message)
    except Exception:
        pass


@app.task
def send_reminders():
    now_utc = datetime.now(pytz.utc)
    prefs = cast(list[dict], supabase.table("reminder_preferences").select("*").eq("enabled", True).execute().data)

    for pref in prefs:
        if not pref.get("fcm_token"):
            continue
        try:
            tz = pytz.timezone(str(pref["timezone"]))
            local_now = now_utc.astimezone(tz)
            reminder_h, reminder_m = map(int, str(pref["reminder_time"]).split(":")[:2])
        except Exception:
            continue
        if local_now.hour != reminder_h or local_now.minute != reminder_m:
            continue

        user_id = str(pref["user_id"])
        today = date.today().isoformat()
        members_rows = cast(list[dict], (
            supabase.table("battle_members")
            .select("battle_id")
            .eq("user_id", user_id)
            .eq("status", "active")
            .execute()
            .data
        ))
        for row in members_rows:
            bid = row["battle_id"]
            checkin_key = f"battle:{bid}:checkedin:{today}"
            # Check both Redis (verified) and DB (any submission)
            db_checkin = supabase.table("checkins").select("id").eq("battle_id", bid).eq("user_id", user_id).eq("date", today).execute().data
            if r.sismember(checkin_key, user_id) or db_checkin:
                continue

            battle = cast(dict, (
                supabase.table("battles")
                .select("habit_name")
                .eq("id", bid)
                .single()
                .execute()
                .data
            ))
            streak_key = f"battle:{bid}:streak:{user_id}"
            streak = int(r.get(streak_key) or 0)

            checked_in = list(r.smembers(checkin_key))
            if checked_in:
                profiles = cast(list[dict], (
                    supabase.table("profiles")
                    .select("username")
                    .in_("id", checked_in[:3])
                    .execute()
                    .data
                ))
                names = ", ".join(str(p["username"]) for p in profiles)
                msg = random.choice(REMINDER_MESSAGES).format(
                    names=names, count=len(checked_in), streak=streak
                )
            else:
                msg = f"⏰ Don't break your {streak}-day streak — check in before midnight!"

            _send_fcm(str(pref["fcm_token"]), f"🔥 {battle['habit_name']}", msg)


@app.task
def reset_streaks():
    now_utc = datetime.now(pytz.utc)
    # Only run between midnight and 12:01 AM UTC
    if now_utc.hour != 0:
        return
    today = date.today().isoformat()
    battles = cast(list[dict], (
        supabase.table("battles").select("id").eq("status", "active").execute().data
    ))

    for battle in battles:
        bid = battle["id"]
        checkin_key = f"battle:{bid}:checkedin:{today}"
        checked_in = set(r.smembers(checkin_key))

        members = cast(list[dict], (
            supabase.table("battle_members")
            .select("user_id, current_streak")
            .eq("battle_id", bid)
            .eq("status", "active")
            .execute()
            .data
        ))

        missed = [m for m in members if m["user_id"] not in checked_in]

        for m in missed:
            uid = str(m["user_id"])
            new_streak = 0
            supabase.table("battle_members").update({"current_streak": new_streak}).eq(
                "battle_id", bid
            ).eq("user_id", uid).execute()
            r.set(f"battle:{bid}:streak:{uid}", 0)

            missed_profile = cast(dict, (
                supabase.table("profiles")
                .select("username")
                .eq("id", uid)
                .single()
                .execute()
                .data
            ))
            username = missed_profile["username"]

            for cid in checked_in:
                cid_pref = cast(list[dict], (
                    supabase.table("reminder_preferences")
                    .select("fcm_token")
                    .eq("user_id", cid)
                    .execute()
                    .data
                ))
                if cid_pref and cid_pref[0].get("fcm_token"):
                    _send_fcm(
                        str(cid_pref[0]["fcm_token"]),
                        "💀 Someone missed!",
                        f"{username} missed today — set their penalty now",
                    )

        r.delete(checkin_key)
