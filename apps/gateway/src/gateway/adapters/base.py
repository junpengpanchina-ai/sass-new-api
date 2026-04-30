from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class UpstreamAdapter(ABC):
    @abstractmethod
    async def chat_completions(self, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        raise NotImplementedError

