import asyncio
import threading

import pytest

from routers import checkins
from routers.checkins import decide_outcome
from services.verdict import Verdict, VerdictError

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32


def post(client, proof_type="photo", name="p.png", ctype="image/png", data=PNG):
    return client.post(
        "/api/checkins",
        data={"battle_id": "b1", "proof_type": proof_type},
        files={"proof_file": (name, data, ctype)},
    )


def verdict(verified=True, score=90):
    return Verdict(verified=verified, score=score, reasoning="ok")


@pytest.mark.parametrize("v, expected", [
    (verdict(True, 90), (True, True, 90)),
    (verdict(True, 60), (True, True, 60)),
    (verdict(False, 90), (False, False, 90)),   # model says no, high score does not override
    (verdict(True, 59), (False, None, 59)),     # jury band
    (verdict(True, 30), (False, None, 30)),
    (verdict(True, 29), (False, False, 29)),    # auto-fail
    (None, (False, None, None)),                # no valid verdict -> jury
])
def test_decide_outcome(v, expected):
    verified, ai_verified, score, _ = decide_outcome(v)
    assert (verified, ai_verified, score) == expected


def test_verified_checkin_updates_streak(client, fake_supabase, fake_redis, monkeypatch):
    monkeypatch.setattr(checkins, "verify_photo", lambda *a: verdict(True, 88))
    res = post(client)
    assert res.status_code == 200
    body = res.json()
    assert body["ai_verified"] is True and body["ai_score"] == 88
    assert fake_supabase.updates("battle_members")[0]["current_streak"] == 3  # seeded at 2
    assert fake_redis.sets  # re-submission blocked


def test_invalid_verdict_routes_to_jury(client, fake_supabase, fake_redis, monkeypatch):
    def boom(*a):
        raise VerdictError("bad")
    monkeypatch.setattr(checkins, "verify_photo", boom)
    res = post(client)
    assert res.status_code == 200
    body = res.json()
    assert body["ai_verified"] is None and body["ai_score"] is None
    assert "jury" in body["ai_reasoning"]
    assert fake_supabase.updates("battle_members") == []  # no streak credit


def test_provider_error_returns_503_and_records_nothing(client, fake_supabase, monkeypatch):
    def boom(*a):
        raise RuntimeError("quota")
    monkeypatch.setattr(checkins, "verify_photo", boom)
    res = post(client)
    assert res.status_code == 503
    assert fake_supabase.inserts("checkins") == []


def test_voice_flow_uses_transcript(client, monkeypatch):
    seen = {}
    monkeypatch.setattr(checkins, "transcribe_audio", lambda path: "i did it")

    def fake_voice(transcript, habit, rules):
        seen.update(transcript=transcript, habit=habit)
        return verdict(False, 10)

    monkeypatch.setattr(checkins, "verify_voice", fake_voice)
    res = post(client, "voice", "a.mp3", "audio/mpeg")
    assert res.status_code == 200
    assert seen == {"transcript": "i did it", "habit": "Gym"}
    assert res.json()["ai_verified"] is False


def test_already_checked_in(client, fake_redis, monkeypatch):
    monkeypatch.setattr(checkins, "verify_photo", lambda *a: verdict())
    assert post(client).status_code == 200
    assert post(client).status_code == 400


def test_non_member_rejected(client, fake_supabase):
    fake_supabase.data["battle_members"] = []
    assert post(client).status_code == 403


def test_bad_content_type_rejected(client):
    assert post(client, "photo", "p.pdf", "application/pdf").status_code == 400


def test_oversized_file_rejected(client, monkeypatch):
    monkeypatch.setattr(checkins, "MAX_UPLOAD_BYTES", 10)
    assert post(client).status_code == 413


def test_blocking_calls_run_off_the_event_loop(client, monkeypatch):
    on_loop = []

    def probe(*a):
        try:
            asyncio.get_running_loop()
            on_loop.append(True)
        except RuntimeError:
            on_loop.append(False)
        return verdict()

    monkeypatch.setattr(checkins, "verify_photo", probe)
    assert post(client).status_code == 200
    assert on_loop == [False]


def test_slow_ai_call_does_not_block_the_loop(client, monkeypatch):
    import time
    release = threading.Event()

    def slow(*a):
        release.wait(2)
        return verdict()

    monkeypatch.setattr(checkins, "verify_photo", slow)

    async def run():
        from httpx import ASGITransport, AsyncClient
        transport = ASGITransport(app=client.app)
        async with AsyncClient(transport=transport, base_url="http://t") as ac:
            task = asyncio.create_task(ac.post(
                "/api/checkins",
                data={"battle_id": "b1", "proof_type": "photo"},
                files={"proof_file": ("p.png", PNG, "image/png")},
            ))
            ticks = 0
            start = time.monotonic()
            while time.monotonic() - start < 0.3:
                await asyncio.sleep(0.01)  # would stall if the AI call ran on the loop
                ticks += 1
            release.set()
            res = await task
            return ticks, res.status_code

    ticks, status = asyncio.run(run())
    assert status == 200
    assert ticks > 10
