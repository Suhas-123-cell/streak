import os
# pyrefly: ignore [missing-import]
from supabase import create_client, Client
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_KEY"]


supabase: Client = create_client(url, key)


auth_supabase: Client = create_client(url, key)
