from __future__ import annotations

from typing import Any

import httpx
from .base import UpstreamAdapter


class OpenAICompatibleAdapter(UpstreamAdapter):
    def __init__(self, *, base_url: str, api_key: str):
        self._base_url = base_url
        self._api_key = api_key

    def _join(self, base: str, path: str) -> str:
        return base.rstrip("/") + "/" + path.lstrip("/")

    async def chat_completions(self, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        url = self._join(self._base_url, "/v1/chat/completions")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        timeout = httpx.Timeout(60.0, connect=10.0)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, headers=headers, json=payload)
        except httpx.RequestError as e:
            raise RuntimeError(f"upstream_request_error: {type(e).__name__}")

        try:
            data = resp.json()
        except Exception:
            data = {"error": {"message": resp.text, "type": "upstream_non_json"}}

        return resp.status_code, data

