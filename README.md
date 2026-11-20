# StreakFight

A habit accountability app where you battle friends to maintain daily streaks. Miss a day and your streak resets — your group sees everything. 

## What it does

- Create battles around any habit (gym, reading, coding, etc.)
- Submit photo, video or voice proof of your daily check-in
- AI (Google Gemini) verifies each submission automatically
- Battle members see who's checked in and who hasn't
- Push notification reminders fire at your chosen time
- Miss a day → streak resets → group assigns a penalty

## Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native 0.85 (iOS) |
| Backend | FastAPI + Uvicorn |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Cache | Redis |
| AI | Google Gemini 2.5 Flash (photo/video/voice verdicts), Groq Whisper (voice transcription) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Task queue | Celery + Celery Beat |

## Project structure

```
streak/
├── backend/
│   ├── main.py                  # FastAPI app, router registration
│   ├── celery_app.py            # Celery + beat schedule
│   ├── tasks.py                 # send_reminders, reset_streaks
│   ├── database.py              # Supabase client
│   ├── redis_client.py          # Redis client
│   ├── middleware/auth.py       # JWT auth middleware
│   ├── routers/
│   │   ├── auth.py              # signup / login
│   │   ├── battles.py           # create / join battles
│   │   ├── checkins.py          # proof submission + AI verification
│   │   ├── members.py           # battle member list + check-in status
│   │   ├── profile.py           # profile, reminder prefs, FCM token
│   │   ├── leaderboard.py       # global leaderboard
│   │   └── penalties.py         # penalty assignment
│   └── services/
│       ├── gemini_verifier.py   # photo/video/voice verdicts (JSON schema, one retry)
│       ├── verdict.py           # strict Verdict model + parser
│       └── transcriber.py       # Groq Whisper transcription
└── frontend/
    ├── App.jsx                  # navigation, FCM setup
    └── src/
        ├── constants/
        │   ├── api.js           # endpoint URLs
        │   └── theme.js         # colours, spacing
        ├── context/AuthContext.js
        ├── components/
        │   ├── ProofSubmitter.jsx
        │   ├── AIVerdictCard.jsx
        │   ├── BattleCard.jsx
        │   ├── MemberRow.jsx
        │   └── PenaltyAssigner.jsx
        ├── screens/
        │   ├── HomeScreen.jsx
        │   ├── BattleDetailScreen.jsx
        │   ├── NewBattleScreen.jsx
        │   ├── AuthScreen.jsx
        │   ├── LeaderboardScreen.jsx
        │   └── ProfileScreen.jsx
        └── services/
            └── notifications.js # FCM token + permission
```

## Running locally

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# copy and fill in your env vars
cp .env.example .env

uvicorn main:app --reload --port 8000

# in separate terminals:
celery -A tasks worker --loglevel=info
celery -A tasks beat --loglevel=info
```

### Required environment variables

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=   # service role key
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=
GROQ_API_KEY=           # Whisper transcription for voice proofs
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
CORS_ORIGINS=*          # optional, comma-separated
RAZORPAY_KEY_ID=        # optional, subscriptions
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### Frontend (iOS)

```bash
cd frontend
npm install
cd ios && pod install && cd ..
npx react-native run-ios --device "YourDevice"
```

Requires `GoogleService-Info.plist` placed at `frontend/ios/StreakFightNew/GoogleService-Info.plist`.

## How proof verification works

1. User records a photo, video or voice note in the app
2. App uploads to FastAPI (`POST /api/checkins`, multipart: `battle_id`, `proof_type`, `proof_file`)
3. Backend writes the file to a temp path (blocking Supabase/Redis/AI calls run in a threadpool, not on the event loop):
   - Photo / video: sent to `gemini-2.5-flash` with the habit context
   - Voice: transcribed by **Groq Whisper (`whisper-large-v3`)**, then the transcript text is judged by Gemini
4. Gemini is called in JSON mode with a response schema; the reply is validated against a strict `Verdict` model (`verified: bool`, `score: int 0-100`, `reasoning: str`). An invalid reply is retried once.
5. Outcome by score: 60+ uses the model's `verified`; 30-59 goes to a jury vote; below 30 fails. If both attempts return an invalid verdict, the check-in is stored with `ai_verified = null` and `ai_score = null` and goes to the jury. If the AI provider itself errors, the API returns 503 and nothing is recorded.
6. Result stored in `checkins`; verified submissions update the Redis streak counter

Voice transcripts are user-controlled text. They are passed to the model inside an `<untrusted_evidence>` block with a system instruction to treat it as data, and the verdict is only ever read from the schema-constrained reply. This reduces prompt-injection risk but does not eliminate it: a model can still be persuaded to score a transcript highly, which is one reason mid-range scores go to the jury.

## Backend tests

```bash
cd backend
uv venv .venv && uv pip install --python .venv/bin/python -r requirements-dev.txt
.venv/bin/python -m pytest
```

Tests mock Gemini, Groq, Supabase and Redis; no keys or services are needed.

## Push notification reminders

1. App requests FCM permission on login and sends the token to `PUT /api/push-token`
2. Token is stored in `reminder_preferences` (upserted, so it works for new users too)
3. User sets a reminder time in their battle settings
4. Celery Beat runs `send_reminders` every 60 seconds
5. For each user with reminders enabled, if the current local time matches their reminder time and they haven't checked in, a FCM notification is sent
