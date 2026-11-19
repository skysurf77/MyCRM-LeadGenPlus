"""
supabase_client.py — client Supabase minimal (REST / PostgREST), sans dépendance.

Couche WAT (Tools). Utilise uniquement la stdlib (urllib) pour ne rien installer.
Lit SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY
depuis l'environnement ou un fichier .env à la racine du projet.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parent.parent


def load_env(env_path: Optional[Path] = None) -> None:
    """Charge un .env simple dans os.environ (sans écraser l'existant)."""
    path = env_path or (ROOT / ".env")
    if not path.exists():
        path = ROOT / ".env.local"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


class SupabaseError(RuntimeError):
    pass


class SupabaseClient:
    def __init__(self, url: Optional[str] = None, service_key: Optional[str] = None):
        load_env()
        self.url = (url or os.environ.get("SUPABASE_URL")
                    or os.environ.get("NEXT_PUBLIC_SUPABASE_URL"))
        self.key = service_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not self.url or not self.key:
            raise SupabaseError(
                "Config manquante : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis "
                "(dans .env ou l'environnement)."
            )
        self.rest = f"{self.url.rstrip('/')}/rest/v1"

    def _request(self, method: str, table: str, *, params: dict | None = None,
                 body: Any = None, prefer: str | None = None) -> Any:
        qs = f"?{urllib.parse.urlencode(params)}" if params else ""
        req = urllib.request.Request(f"{self.rest}/{table}{qs}", method=method)
        req.add_header("apikey", self.key)
        req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Content-Type", "application/json")
        if prefer:
            req.add_header("Prefer", prefer)
        data = json.dumps(body).encode("utf-8") if body is not None else None
        try:
            with urllib.request.urlopen(req, data=data, timeout=60) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")
            raise SupabaseError(f"{e.code} {e.reason} — {detail}") from e

    def insert(self, table: str, row: dict) -> list:
        return self._request("POST", table, body=[row], prefer="return=representation")

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> None:
        self._request(
            "POST", table,
            params={"on_conflict": on_conflict},
            body=rows,
            prefer="resolution=merge-duplicates,return=minimal",
        )

    def select(self, table: str, select: str = "*", **filters) -> list:
        params = {"select": select, **filters}
        return self._request("GET", table, params=params) or []
