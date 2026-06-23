import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded 
from extensions import limiter
from routers import auth, battles, members, checkins, penalties, leaderboard, profile, jury, rewards

app = FastAPI(title="StreakFight API")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # pyrefly: ignore

cors_origins_raw = os.environ.get("CORS_ORIGINS", "*")
cors_origins = ["*"] if cors_origins_raw == "*" else cors_origins_raw.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(battles.router, prefix="/api/battles", tags=["battles"])
app.include_router(members.router, prefix="/api/battles", tags=["members"])
app.include_router(checkins.router, prefix="/api/checkins", tags=["checkins"])
app.include_router(penalties.router, prefix="/api/penalties", tags=["penalties"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(jury.router, prefix="/api/jury", tags=["jury"])
app.include_router(rewards.router, prefix="/api/rewards", tags=["rewards"])


@app.get("/")
def health():
    return {"status": "ok"}
