import os
import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("GROQ_API_KEY", "test-key")


class FakeQuery:
    """Chainable stand-in for a supabase-py query builder."""

    def __init__(self, db, table):
        self.db, self.table = db, table
        self.op = "select"
        self.payload = None
        self.is_single = False

    def __getattr__(self, name):
        if name == "single":
            def single():
                self.is_single = True
                return self
            return single
        if name in ("insert", "update", "upsert"):
            def op(payload, *a, **k):
                self.op, self.payload = name, payload
                return self
            return op
        return lambda *a, **k: self

    def execute(self):
        self.db.calls.append((self.table, self.op, self.payload))
        if self.op == "insert":
            return SimpleNamespace(data=[{"id": "checkin-1", **self.payload}])
        data = self.db.data.get(self.table)
        if self.is_single and isinstance(data, list):
            data = data[0]
        return SimpleNamespace(data=data, count=1)


class FakeStorage:
    def from_(self, bucket):
        return self

    def upload(self, *a, **k):
        return None

    def get_public_url(self, path):
        return f"https://storage.test/{path}"


class FakeSupabase:
    def __init__(self):
        self.calls = []
        self.storage = FakeStorage()
        self.data = {
            "battle_members": [{"id": "m1", "current_streak": 2, "longest_streak": 5, "freeze_tokens": 0}],
            "battles": {"habit_name": "Gym", "habit_description": "Show the gym"},
        }

    def table(self, name):
        return FakeQuery(self, name)

    def inserts(self, table):
        return [p for t, op, p in self.calls if t == table and op == "insert"]

    def updates(self, table):
        return [p for t, op, p in self.calls if t == table and op == "update"]


class FakeRedis:
    def __init__(self):
        self.sets, self.kv = {}, {}

    def sismember(self, key, member):
        return member in self.sets.get(key, set())

    def sadd(self, key, member):
        self.sets.setdefault(key, set()).add(member)

    def exists(self, key):
        return key in self.kv

    def set(self, key, value):
        self.kv[key] = int(value)

    def incr(self, key):
        self.kv[key] = self.kv.get(key, 0) + 1
        return self.kv[key]

    def expire(self, *a):
        pass

    def delete(self, *a):
        pass


# routers import these modules at import time and they open real connections.
_fake_db = types.ModuleType("database")
_fake_db.supabase = FakeSupabase()
_fake_db.auth_supabase = FakeSupabase()
sys.modules["database"] = _fake_db

_fake_redis = types.ModuleType("redis_client")
_fake_redis.r = FakeRedis()
sys.modules["redis_client"] = _fake_redis


@pytest.fixture
def fake_supabase(monkeypatch):
    from routers import checkins
    db = FakeSupabase()
    monkeypatch.setattr(checkins, "supabase", db)
    return db


@pytest.fixture
def fake_redis(monkeypatch):
    from routers import checkins
    rds = FakeRedis()
    monkeypatch.setattr(checkins, "r", rds)
    return rds


@pytest.fixture
def client(fake_supabase, fake_redis):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from extensions import limiter
    from middleware.auth import get_current_user
    from routers import checkins

    limiter.enabled = False
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(checkins.router, prefix="/api/checkins")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="user-1")
    return TestClient(app)
