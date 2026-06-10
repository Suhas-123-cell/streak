from fastapi import Header, HTTPException
from database import auth_supabase


async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        resp = auth_supabase.auth.get_user(token)
        return resp.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
