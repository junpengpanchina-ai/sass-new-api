from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response

from .auth import require_dev_token
from .adapters.factory import get_adapter
from .settings import Settings
from .supabase_store import (
    UpstreamConfigCache,
    decrypt_api_key,
    fetch_enabled_upstream_models,
    fetch_enabled_upstreams,
)


def v1_router(settings: Settings) -> APIRouter:
    router = APIRouter(prefix="/v1")
    cache = UpstreamConfigCache(ttl_seconds=settings.upstream_cache_ttl_seconds)

    async def load_config() -> tuple[list, list]:
        if cache.is_fresh():
            return cache.get()
        upstreams = await fetch_enabled_upstreams(settings)
        models = await fetch_enabled_upstream_models(settings)
        cache.set(upstreams, models)
        return cache.get()

    def enabled_models_from_config(upstream_models) -> set[str]:
        return {m.model for m in upstream_models}

    @router.get("/models")
    async def list_models():
        upstreams, upstream_models = await load_config()
        if not upstreams:
            # No upstream configured yet
            return {"object": "list", "data": []}
        models = sorted(enabled_models_from_config(upstream_models))
        return {
            "object": "list",
            "data": [{"id": m, "object": "model", "created": 0, "owned_by": "upstream"} for m in models],
        }

    @router.post("/chat/completions")
    async def chat_completions(request: Request):
        # Auth (dev mode): Bearer token must match DEV_TOKENS list
        _ = require_dev_token(request, settings)

        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="invalid_json")

        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="invalid_payload")

        # V1 (core chain first): non-stream only
        if payload.get("stream") is True:
            raise HTTPException(status_code=400, detail="stream_not_supported_yet")

        try:
            upstreams, upstream_models = await load_config()
            if not upstreams:
                raise RuntimeError("no_upstream_configured")

            model = payload.get("model")
            if not isinstance(model, str) or not model.strip():
                raise HTTPException(status_code=400, detail="missing_model")
            model = model.strip()

            # Find first upstream that enables this model
            allowed_upstream_ids = {m.upstream_id for m in upstream_models if m.model == model}
            chosen = next((u for u in upstreams if u.id in allowed_upstream_ids), None)
            if not chosen:
                raise HTTPException(status_code=404, detail="model_not_configured")

            api_key = decrypt_api_key(chosen.api_key_enc, settings)
            adapter = get_adapter(kind=chosen.kind, base_url=chosen.base_url, api_key=api_key)
            status, data = await adapter.chat_completions(payload=payload)
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

        return Response(
            content=json.dumps(data),
            status_code=status,
            media_type="application/json",
        )

    return router

