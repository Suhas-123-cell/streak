import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_url = os.environ["SUPABASE_URL"]
_key = os.environ["SUPABASE_SERVICE_KEY"]

# Data client — never call .auth.sign_in / sign_up on this one.
# supabase-py v2 rewrites the PostgREST Authorization header on SIGNED_IN events,
# which would cause all table() calls to run as the user role and hit RLS.
supabase: Client = create_client(_url, _key)

# Auth-only client — used exclusively for GoTrue sign_up / sign_in calls.
# Its PostgREST session can be overwritten freely; we never use it for table ops.
auth_supabase: Client = create_client(_url, _key)
