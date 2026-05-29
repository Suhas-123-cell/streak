from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, battles, members, checkins, penalties, leaderboard, profile

app = FastAPI(title="StreakFight API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/")
def health():
    return {"status": "ok"}
