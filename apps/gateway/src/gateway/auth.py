from __future__ import annotations

import hashlib
from dataclasses import dataclass

from fastapi import HTTPException, Request

from .settings import Settings


@dataclass(frozen=True)
class AuthResult:
    token: str


def _parse_bearer(request: Request) -> str | None:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth:
        return None
    parts = auth.split(" ", 1)
    if len(parts) != 2:
        return None
    scheme, value = parts[0].strip(), parts[1].strip()
    if scheme.lower() != "bearer" or not value:
        return None
    return value


def _split_csv(v: str | None) -> set[str]:
    if not v:
        return set()
    return {x.strip() for x in v.split(",") if x.strip()}


def require_dev_token(request: Request, settings: Settings) -> AuthResult:
    """
    V1 core-chain-first mode:
    - validate against plaintext tokens from env DEV_TOKENS
    - later replaced by DB lookup (tokens table), without changing gateway API shape
    """
    token = _parse_bearer(request)
    if not token:
        raise HTTPException(status_code=401, detail="missing_bearer_token")

    allow = _split_csv(settings.dev_tokens)
    if not allow:
        raise HTTPException(status_code=503, detail="dev_tokens_not_configured")

    if token not in allow:
        raise HTTPException(status_code=403, detail="invalid_token")

    return AuthResult(token=token)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

