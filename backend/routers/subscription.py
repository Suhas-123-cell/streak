import os
import hmac
import hashlib
import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from database import supabase
from middleware.auth import get_current_user

router = APIRouter()

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

FREE_BATTLE_LIMIT = 20  # generous limit so the social loop forms; Pro gates freeze tokens + AI
FREE_AI_CHECKINS_PER_DAY = 10

PLANS = {
    "pro_monthly": {"amount": 64900, "currency": "INR", "label": "Pro Monthly"},
    "pro_yearly":  {"amount": 499900, "currency": "INR", "label": "Pro Yearly"},
}


def _client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(503, "Payment gateway not configured")
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def is_pro(user_id: str) -> bool:
    row = supabase.table("subscriptions").select("status").eq("user_id", user_id).execute()
    return bool(row.data and row.data[0].get("status") == "active")


@router.get("/status")
async def subscription_status(user=Depends(get_current_user)):
    row = supabase.table("subscriptions").select("*").eq("user_id", user.id).execute()
    if not row.data:
        return {"status": "free", "plan": None, "current_period_end": None, "is_pro": False}
    s = row.data[0]
    return {
        "status": s.get("status", "free"),
        "plan": s.get("plan"),
        "current_period_end": s.get("current_period_end"),
        "is_pro": s.get("status") == "active",
    }


@router.post("/order")
async def create_order(body: dict, user=Depends(get_current_user)):
    plan = body.get("plan", "pro_monthly")
    if plan not in PLANS:
        raise HTTPException(400, "Invalid plan")
    p = PLANS[plan]
    client = _client()
    order = client.order.create({
        "amount": p["amount"],
        "currency": p["currency"],
        "receipt": f"sf_{user.id[:8]}_{plan[:3]}",
        "notes": {"user_id": user.id, "plan": plan},
    })
    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key_id": RAZORPAY_KEY_ID,
        "plan": plan,
    }


@router.post("/verify")
async def verify_payment(body: dict, user=Depends(get_current_user)):
    order_id = body.get("razorpay_order_id", "")
    payment_id = body.get("razorpay_payment_id", "")
    signature = body.get("razorpay_signature", "")
    plan = body.get("plan", "pro_monthly")

    if not all([order_id, payment_id, signature]):
        raise HTTPException(400, "Missing payment fields")

    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid payment signature")

    from datetime import datetime, timezone, timedelta
    period_end = datetime.now(timezone.utc) + (timedelta(days=30) if plan == "pro_monthly" else timedelta(days=365))

    supabase.table("subscriptions").upsert({
        "user_id": user.id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "status": "active",
        "plan": plan,
        "current_period_end": period_end.isoformat(),
    }).execute()
    supabase.table("profiles").update({"is_pro": True}).eq("id", user.id).execute()

    return {"ok": True, "is_pro": True, "current_period_end": period_end.isoformat()}


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

    if secret:
        expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(400, "Invalid webhook signature")

    import json
    event = json.loads(payload)
    entity = event.get("payload", {}).get("subscription", {}).get("entity", {})
    if not entity:
        return {"ok": True}

    sub_id = entity.get("id")
    status = entity.get("status")
    notes = entity.get("notes", {})
    user_id = notes.get("user_id")

    if user_id and sub_id:
        mapped = "active" if status == "active" else ("past_due" if status == "halted" else "canceled")
        supabase.table("subscriptions").update({"status": mapped}).eq("user_id", user_id).execute()
        supabase.table("profiles").update({"is_pro": mapped == "active"}).eq("id", user_id).execute()

    return {"ok": True}
