from __future__ import annotations

from .base import UpstreamAdapter
from .openai_compatible import OpenAICompatibleAdapter


def get_adapter(*, kind: str, base_url: str, api_key: str) -> UpstreamAdapter:
    k = (kind or "openai_compatible").strip().lower()
    if k == "openai_compatible":
        return OpenAICompatibleAdapter(base_url=base_url, api_key=api_key)

    raise RuntimeError(f"unsupported_upstream_kind: {k}")

