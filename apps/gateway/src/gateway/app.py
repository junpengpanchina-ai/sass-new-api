from __future__ import annotations

from fastapi import FastAPI

from .api_v1 import v1_router
from .profiling import maybe_start_pyroscope, pprof_router
from .settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="Token SaaS Gateway", version="0.1.0")

    warning = maybe_start_pyroscope(settings)
    if warning:
        app.state.pyroscope_warning = warning

    if settings.enable_pprof:
        app.include_router(pprof_router(settings))

    app.include_router(v1_router(settings))

    @app.get("/healthz")
    def healthz():
        return {
            "ok": True,
            "pprof": bool(settings.enable_pprof),
            "pyroscope": bool(settings.pyroscope_url),
            "pyroscope_warning": getattr(app.state, "pyroscope_warning", None),
            "v1": {"models": "/v1/models", "chat_completions": "/v1/chat/completions"},
        }

    return app

