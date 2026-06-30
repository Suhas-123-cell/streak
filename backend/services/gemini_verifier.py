import os
import json
import io
import PIL.Image
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

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
    img = PIL.Image.open(image_path)
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    image_bytes = buf.getvalue()
    prompt = PHOTO_PROMPT.format(habit=habit, rules=rules or "")
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=types.Content(
            role='user',
            parts=[
                types.Part.from_text(text=prompt),
                types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
            ]
        )
    )
    return _parse(response.text or "")


VIDEO_PROMPT = """You are a strict habit accountability judge.

The user's habit is: "{habit}"
Proof rules: "{rules}"

Watch this short video clip and determine if it is valid proof they completed their habit today.
- Reject if the video is clearly unrelated to the habit
- Reject if it appears to be old footage or a recording of a screen
- Be strict but fair

Return ONLY this JSON:
{{"verified": true | false, "score": 0-100, "reasoning": "one sentence"}}"""


def verify_video(video_path: str, habit: str, rules: str) -> dict:
    ext = video_path.rsplit('.', 1)[-1].lower()
    mime_map = {'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo', 'webm': 'video/webm'}
    mime_type = mime_map.get(ext, 'video/mp4')
    with open(video_path, 'rb') as f:
        video_bytes = f.read()
    prompt = VIDEO_PROMPT.format(habit=habit, rules=rules or "")
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=types.Content(
            role='user',
            parts=[
                types.Part.from_text(text=prompt),
                types.Part.from_bytes(data=video_bytes, mime_type=mime_type),
            ]
        )
    )
    return _parse(response.text or "")


def verify_voice(transcript: str, habit: str, rules: str) -> dict:
    prompt = VOICE_PROMPT.format(habit=habit, rules=rules or "", transcript=transcript)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt
    )
    return _parse(response.text or "")
