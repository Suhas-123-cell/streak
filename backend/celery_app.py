import os
# pyrefly: ignore [missing-import]
from celery import Celery
# pyrefly: ignore [missing-import]
from celery.schedules import crontab
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

app = Celery("streakfight", broker=os.environ.get("REDIS_URL", "redis://localhost:6379"))
# pyrefly: ignore [read-only]
app.conf.timezone = "UTC"

app.conf.beat_schedule = {
    "send-reminders": {
        "task": "tasks.send_reminders",
        "schedule": 60.0,
    },
    "reset-streaks": {
        "task": "tasks.reset_streaks",
        "schedule": crontab(hour=0, minute=1),
    },
}
