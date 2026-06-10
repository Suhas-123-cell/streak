# StreakFight

A habit accountability app where you battle friends to maintain daily streaks. Miss a day and your streak resets — your group sees everything.

## What it does

- Create battles around any habit (gym, reading, coding, etc.)
- Submit photo or voice proof of your daily check-in
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
| AI | Google Gemini (photo verification + voice transcription) |
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
│       └── gemini_verifier.py   # photo + voice proof verification
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
SUPABASE_KEY=           # service role key
SUPABASE_AUTH_URL=
SUPABASE_AUTH_KEY=      # anon key
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
JWT_SECRET=
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

1. User records a photo or voice note in the app
2. App uploads to FastAPI (`POST /api/checkins/{battle_id}/proof`)
3. Backend writes the file to a temp path, calls Gemini:
   - Photo → `gemini-2.0-flash` with the image bytes + habit context
   - Voice → transcribed first, then verified as text
4. Gemini returns `verified: true/false` + a score + feedback
5. Result stored in `checkins` table; verified submissions update the Redis streak counter

## Push notification reminders

1. App requests FCM permission on login and sends the token to `PUT /api/push-token`
2. Token is stored in `reminder_preferences` (upserted, so it works for new users too)
3. User sets a reminder time in their battle settings
4. Celery Beat runs `send_reminders` every 60 seconds
5. For each user with reminders enabled, if the current local time matches their reminder time and they haven't checked in, a FCM notification is sent
