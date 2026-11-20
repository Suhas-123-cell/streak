import pytest

from services.verdict import MAX_REASONING_CHARS, Verdict, VerdictError, parse_verdict


def test_valid_verdict():
    v = parse_verdict('{"verified": true, "score": 82, "reasoning": "Clear gym photo."}')
    assert v == Verdict(verified=True, score=82, reasoning="Clear gym photo.")


@pytest.mark.parametrize("text", [
    '{"verified": true, "score": "85", "reasoning": "x"}',       # score as string
    '{"verified": true, "score": 85.5, "reasoning": "x"}',       # fractional score
    '{"verified": true, "score": 101, "reasoning": "x"}',        # above range
    '{"verified": true, "score": -1, "reasoning": "x"}',         # below range
    '{"verified": "true", "score": 80, "reasoning": "x"}',       # verified as string
    '{"verified": true, "score": true, "reasoning": "x"}',       # bool is not an int score
    '{"verified": true, "score": 80}',                           # missing reasoning
    '{"verified": true, "score": null, "reasoning": "x"}',
    '[]',
    '',
    'not json',
])
def test_invalid_verdicts_rejected(text):
    with pytest.raises(VerdictError):
        parse_verdict(text)


def test_json_embedded_in_prose_is_not_extracted():
    text = 'Sure! Here you go: {"verified": true, "score": 100, "reasoning": "ok"} Thanks.'
    with pytest.raises(VerdictError):
        parse_verdict(text)


def test_long_reasoning_is_clipped():
    v = parse_verdict('{"verified": false, "score": 10, "reasoning": "' + "a" * 2000 + '"}')
    assert len(v.reasoning) == MAX_REASONING_CHARS
