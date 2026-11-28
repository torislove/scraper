"""
server/python/distiller.py
Read-Only DuckDB Distillation & SQL Export Layer + Optional Shared FastEmbed Client.
Reads directly from append-only vendors_journal.jsonl without locking the live write path.
"""

import json
import os
import urllib.request
from pathlib import Path

try:
    import duckdb
except ImportError:
    duckdb = None


def query_journal_duckdb(journal_path, filters=None, limit=5000):
    """Runs read-only DuckDB SQL queries over vendors_journal.jsonl with universal filter flags."""
    if duckdb is None or not journal_path or not Path(journal_path).exists():
        return {"ok": False, "error": "duckdb_or_journal_unavailable", "leads": []}

    filters = filters or {}
    if Path(journal_path).stat().st_size == 0:
        return {"ok": True, "count": 0, "leads": []}

    con = duckdb.connect(database=":memory:", read_only=False)
    try:
        where = ["COALESCE(upper(businessStatus), 'OPERATIONAL') != 'CLOSED_PERMANENTLY'"]
        params = []

        if filters.get("country"):
            where.append("upper(COALESCE(country, '')) = ?")
            params.append(str(filters["country"]).upper())
        if filters.get("state"):
            where.append("lower(COALESCE(state, '')) = ?")
            params.append(str(filters["state"]).lower())
        if filters.get("city"):
            where.append("lower(COALESCE(city, '')) LIKE ?")
            params.append(f"%{str(filters['city']).lower()}%")
        if filters.get("postalCode"):
            where.append("replace(upper(COALESCE(postalCode, pincode, '')), ' ', '') = ?")
            params.append(str(filters["postalCode"]).replace(" ", "").upper())
        if filters.get("hasMobile"):
            where.append("(COALESCE(isMobile, false) = true OR COALESCE(mobilePhone, '') != '')")
        if filters.get("hasWhatsapp"):
            where.append("(COALESCE(whatsappAvailable, false) = true OR COALESCE(whatsappLink, '') != '')")
        if filters.get("hasVerifiedEmail"):
            where.append("COALESCE(emailVerified, false) = true AND COALESCE(email, '') != ''")
        if filters.get("hasWebsite"):
            where.append("COALESCE(website, '') != ''")
        if filters.get("minRating") is not None:
            where.append("COALESCE(rating, 0) >= ?")
            params.append(float(filters["minRating"]))
        if filters.get("minReviews") is not None:
            where.append("COALESCE(reviewsCount, 0) >= ?")
            params.append(int(filters["minReviews"]))
        if filters.get("minQualityScore") is not None:
            where.append("COALESCE(qualityScore, 0) >= ?")
            params.append(int(filters["minQualityScore"]))
        if filters.get("minSourcesCount") is not None:
            where.append("COALESCE(sourceCount, 1) >= ?")
            params.append(int(filters["minSourcesCount"]))

        norm_path = str(Path(journal_path).resolve()).replace("\\", "/")
        sql = f"""
            SELECT *
            FROM read_json_auto('{norm_path}', union_by_name=true, ignore_errors=true)
            WHERE {' AND '.join(where)}
            LIMIT {max(1, min(25000, int(limit or 5000)))}
        """
        rel = con.execute(sql, params)
        cols = [d[0] for d in rel.description]
        rows = [dict(zip(cols, r)) for r in rel.fetchall()]
        return {"ok": True, "count": len(rows), "leads": rows}
    finally:
        con.close()


def score_relevance_remote(subcategory, texts, timeout=2.5):
    """Calls optional shared fastembed microservice (:5004/score) when RELEVANCE_SCORER_URL is set."""
    url = os.environ.get("RELEVANCE_SCORER_URL", "").strip().rstrip("/")
    if not url or not subcategory or not texts:
        return None
    try:
        payload = json.dumps({"subcategory": subcategory, "texts": texts}).encode("utf-8")
        req = urllib.request.Request(
            f"{url}/score",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("scores")
    except Exception:
        return None
