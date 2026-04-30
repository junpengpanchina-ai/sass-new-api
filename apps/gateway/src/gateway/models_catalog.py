from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelInfo:
    id: str
    owned_by: str
    enabled: bool = True


MODELS: list[ModelInfo] = [
    ModelInfo(id="gpt-4.1-mini", owned_by="openai", enabled=True),
    ModelInfo(id="gpt-4.1", owned_by="openai", enabled=True),
    ModelInfo(id="o4-mini", owned_by="openai", enabled=True),
]


def openai_models_list() -> dict:
    return {
        "object": "list",
        "data": [
            {
                "id": m.id,
                "object": "model",
                "created": 0,
                "owned_by": m.owned_by,
            }
            for m in MODELS
            if m.enabled
        ],
    }

