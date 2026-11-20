import json

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

MAX_REASONING_CHARS = 500


class VerdictError(Exception):
    """The model output could not be turned into a valid Verdict."""


class Verdict(BaseModel):
    # strict: "85" is not a score and "true" is not a bool
    model_config = ConfigDict(strict=True)

    verified: bool
    score: int = Field(ge=0, le=100)
    reasoning: str

    @field_validator("reasoning")
    @classmethod
    def _clip_reasoning(cls, v: str) -> str:
        return v.strip()[:MAX_REASONING_CHARS]


def parse_verdict(text: str) -> Verdict:
    """Parse the model's raw text as a Verdict. No scanning for JSON inside prose."""
    try:
        return Verdict.model_validate_json(text)
    except (ValidationError, ValueError, json.JSONDecodeError) as e:
        raise VerdictError(f"invalid verdict: {str(e)[:200]}") from e
