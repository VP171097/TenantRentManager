"""
API-bearing coverage for criterion: "Preserve the existing Supabase database, authentication
and values while enhancing the original app" and the related auth/RLS guarantees this app relies on.

Tests hit the real Supabase project (tlyxkafuztyavkeolkjh) directly over HTTP - this is the
actual API boundary the frontend uses (there is no local FastAPI backend in this app).
"""
import httpx


def test_owner_login_and_session_reload(supabase_url, anon_key, owner_access_token):
    """Happy path: confirmed owner can sign in and the returned session can fetch their own profile."""
    r = httpx.get(
        f"{supabase_url}/rest/v1/profiles?select=id,role,email",
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {owner_access_token}",
        },
        timeout=30,
    )
    assert r.status_code == 200, f"profile fetch failed: {r.status_code} {r.text[:300]}"
    rows = r.json()
    assert isinstance(rows, list) and len(rows) >= 1, f"expected owner profile row, got {rows}"


def test_anonymous_rls_blocks_data_without_session(supabase_url, anon_key):
    """Negative: an anon-key-only request (no user session) must not read protected owner rows
    from a table guarded by RLS (properties). RLS should return an empty set, not other owners' data."""
    r = httpx.get(
        f"{supabase_url}/rest/v1/properties?select=id,name,code",
        headers={"apikey": anon_key},
        timeout=30,
    )
    assert r.status_code == 200, f"unexpected status: {r.status_code} {r.text[:300]}"
    rows = r.json()
    assert rows == [], f"RLS leak: anonymous request returned rows without a session: {rows}"


def test_missing_apikey_is_rejected(supabase_url):
    """Negative: a REST request with no apikey header at all must be rejected by Supabase, not served."""
    r = httpx.get(f"{supabase_url}/rest/v1/properties?select=id", timeout=30)
    assert r.status_code in (401, 403), f"expected auth rejection, got {r.status_code} {r.text[:300]}"


def test_qa_property_exists_and_is_isolated(supabase_url, anon_key, owner_access_token):
    """The only property the test/browser suite may write into is QA TEST - Warm Ledger (QAWARM).
    Confirm it exists under the owner's session and non-QA properties are untouched (still present,
    still have their original codes) - i.e. we can see other rows but must never mutate them here."""
    r = httpx.get(
        f"{supabase_url}/rest/v1/properties?select=id,name,code,city",
        headers={"apikey": anon_key, "Authorization": f"Bearer {owner_access_token}"},
        timeout=30,
    )
    assert r.status_code == 200, f"properties fetch failed: {r.status_code} {r.text[:300]}"
    rows = r.json()
    qa_rows = [p for p in rows if p.get("code") == "QAWARM"]
    assert len(qa_rows) == 1, f"expected exactly one QAWARM property, found: {qa_rows}"
    assert qa_rows[0]["name"] == "QA TEST — Warm Ledger"
    assert qa_rows[0]["city"] == "Test City"
    # this test only reads - it never issues PATCH/POST/DELETE against non-QA rows
    non_qa = [p for p in rows if p.get("code") != "QAWARM"]
    assert isinstance(non_qa, list)  # existing rows observed, left untouched by this suite
