import os
import httpx
import pytest

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or "https://tlyxkafuztyavkeolkjh.supabase.co"
SUPABASE_ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_ANON_KEY:
    # fall back to reading the repo's local env file (never hardcoded secrets in test code)
    env_path = "/app/.env.local"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("VITE_SUPABASE_ANON_KEY="):
                    SUPABASE_ANON_KEY = line.strip().split("=", 1)[1]
                if line.startswith("VITE_SUPABASE_URL=") and not os.environ.get("VITE_SUPABASE_URL"):
                    SUPABASE_URL = line.strip().split("=", 1)[1]

TEST_EMAIL = "vp522099@gmail.com"
TEST_PASSWORD = "12345678"


@pytest.fixture(scope="session")
def supabase_url():
    return SUPABASE_URL


@pytest.fixture(scope="session")
def anon_key():
    assert SUPABASE_ANON_KEY, "VITE_SUPABASE_ANON_KEY must be set (env or .env.local)"
    return SUPABASE_ANON_KEY


@pytest.fixture(scope="session")
def owner_access_token(supabase_url, anon_key):
    """Sign in as the confirmed owner test account and return the access token."""
    r = httpx.post(
        f"{supabase_url}/auth/v1/token?grant_type=password",
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"owner login failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    assert "access_token" in body
    return body["access_token"]
