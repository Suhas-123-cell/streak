import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-2.0-flash-exp")

PHOTO_PROMPT = """You are a strict habit accountability judge.

The user's habit is: "{habit}"
Proof rules: "{rules}"

Analyse this image and determine if it is valid proof.
- Reject if the image is clearly unrelated to the habit
- Reject if it looks like a stock photo or screenshot of a photo
- Be strict but fair

Return ONLY this JSON:
{{"verified": true | false, "score": 0-100, "reasoning": "one sentence"}}"""

VOICE_PROMPT = """You are a strict habit accountability judge.

The user's habit is: "{habit}"
Proof rules: "{rules}"

Transcription of their 10-second voice note: "{transcript}"

Determine if this is plausible evidence they completed their habit today.
Reject if it sounds scripted, too vague, or completely unrelated.

Return ONLY this JSON:
{{"verified": true | false, "score": 0-100, "reasoning": "one sentence"}}"""


def _parse(text: str) -> dict:
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return {"verified": False, "score": 0, "reasoning": "AI parse error"}


def verify_photo(image_path: str, habit: str, rules: str) -> dict:
    import PIL.Image
    img = PIL.Image.open(image_path)
    prompt = PHOTO_PROMPT.format(habit=habit, rules=rules or "")
    response = model.generate_content([prompt, img])
    return _parse(response.text)


def verify_voice(transcript: str, habit: str, rules: str) -> dict:
    prompt = VOICE_PROMPT.format(habit=habit, rules=rules or "", transcript=transcript)
    response = model.generate_content(prompt)
    return _parse(response.text)
