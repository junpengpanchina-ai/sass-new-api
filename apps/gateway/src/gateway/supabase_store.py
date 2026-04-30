from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import httpx

from .settings import Settings


@dataclass(frozen=True)
class UpstreamRecord:
    id: str
    name: str
    kind: str
    base_url: str
    api_key_enc: str
    api_key_kid: str | None


@dataclass(frozen=True)
class UpstreamModelRecord:
    upstream_id: str
    model: str


class UpstreamConfigCache:
    def __init__(self, ttl_seconds: int):
        self._ttl = max(1, ttl_seconds)
        self._loaded_at = 0.0
        self._upstreams: list[UpstreamRecord] = []
        self._models: list[UpstreamModelRecord] = []

    def is_fresh(self) -> bool:
        return (time.time() - self._loaded_at) < self._ttl

    def set(self, upstreams: list[UpstreamRecord], models: list[UpstreamModelRecord]) -> None:
        self._loaded_at = time.time()
        self._upstreams = upstreams
        self._models = models

    def get(self) -> tuple[list[UpstreamRecord], list[UpstreamModelRecord]]:
        return self._upstreams, self._models


def _rest_base(settings: Settings) -> str:
    if not settings.supabase_url:
        raise RuntimeError("supabase_url_not_configured")
    return settings.supabase_url.rstrip("/") + "/rest/v1"


def _rest_headers(settings: Settings) -> dict[str, str]:
    if not settings.supabase_service_role_key:
        raise RuntimeError("supabase_service_role_key_not_configured")
    key = settings.supabase_service_role_key
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }


async def fetch_enabled_upstreams(settings: Settings) -> list[UpstreamRecord]:
    url = _rest_base(settings) + "/upstreams"
    params = {
        "select": "id,name,kind,base_url,api_key_enc,api_key_kid,status",
        "status": "eq.enabled",
        "order": "created_at.asc",
    }
    timeout = httpx.Timeout(20.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, headers=_rest_headers(settings), params=params)
    if resp.status_code >= 400:
        raise RuntimeError(f"supabase_upstreams_fetch_failed:{resp.status_code}")
    rows = resp.json()
    out: list[UpstreamRecord] = []
    for r in rows:
        out.append(
            UpstreamRecord(
                id=str(r["id"]),
                name=str(r["name"]),
                kind=str(r.get("kind") or "openai_compatible"),
                base_url=str(r["base_url"]),
                api_key_enc=str(r["api_key_enc"]),
                api_key_kid=r.get("api_key_kid"),
            )
        )
    return out


async def fetch_enabled_upstream_models(settings: Settings) -> list[UpstreamModelRecord]:
    url = _rest_base(settings) + "/upstream_models"
    params = {
        "select": "upstream_id,model,enabled",
        "enabled": "eq.true",
        "order": "id.asc",
    }
    timeout = httpx.Timeout(20.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, headers=_rest_headers(settings), params=params)
    if resp.status_code >= 400:
        raise RuntimeError(f"supabase_upstream_models_fetch_failed:{resp.status_code}")
    rows = resp.json()
    out: list[UpstreamModelRecord] = []
    for r in rows:
        out.append(UpstreamModelRecord(upstream_id=str(r["upstream_id"]), model=str(r["model"])))
    return out


def decrypt_api_key(enc: str, settings: Settings) -> str:
    """
    V1 minimal: allow plaintext passthrough when upstream_secret_key is not set.
    In production, set upstream_secret_key and store encrypted payloads only.
    """
    if not settings.upstream_secret_key:
        # Treat as plaintext (V1 local / bring-up)
        return enc
    # Simple XOR-based obfuscation is intentionally NOT implemented.
    # Require proper encryption before enabling in production.
    raise RuntimeError("upstream_secret_key_set_but_decrypt_not_implemented")

