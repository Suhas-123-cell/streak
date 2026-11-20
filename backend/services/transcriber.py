import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client


def transcribe_audio(audio_file_path: str) -> str:
    with open(audio_file_path, "rb") as f:
        transcription = _get_client().audio.transcriptions.create(
            file=f,
            model="whisper-large-v3",
        )
    return transcription.text
