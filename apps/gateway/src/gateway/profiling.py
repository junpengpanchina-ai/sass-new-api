from __future__ import annotations

from dataclasses import dataclass

from fastapi import APIRouter, HTTPException, Response

from .settings import Settings


@dataclass(frozen=True)
class ProfilingState:
    pyinstrument_available: bool
    pyroscope_available: bool


def _detect() -> ProfilingState:
    try:
        import pyinstrument  # noqa: F401

        pyinstrument_available = True
    except Exception:
        pyinstrument_available = False

    try:
        import pyroscope  # type: ignore # noqa: F401

        pyroscope_available = True
    except Exception:
        pyroscope_available = False

    return ProfilingState(pyinstrument_available=pyinstrument_available, pyroscope_available=pyroscope_available)


def maybe_start_pyroscope(settings: Settings) -> str | None:
    if not settings.pyroscope_url:
        return None

    state = _detect()
    if not state.pyroscope_available:
        return "PYROSCOPE_URL set but pyroscope is not installed. Install optional deps: `pip install -e .[profiling]`"

    import pyroscope  # type: ignore

    tags: dict[str, str] = {}
    if settings.hostname:
        tags["hostname"] = settings.hostname

    auth = None
    if settings.pyroscope_basic_auth_user and settings.pyroscope_basic_auth_password:
        auth = (settings.pyroscope_basic_auth_user, settings.pyroscope_basic_auth_password)

    app_name = settings.pyroscope_app_name or "token-saas-gateway"

    pyroscope.configure(
        application_name=app_name,
        server_address=settings.pyroscope_url,
        basic_auth_username=auth[0] if auth else None,
        basic_auth_password=auth[1] if auth else None,
        tags=tags if tags else None,
    )

    # NOTE: Python client does not support mutex/block rates the same way as Go pprof.
    # We keep env vars for parity with the reference docs, but they are ignored here.
    return None


def pprof_router(settings: Settings) -> APIRouter:
    router = APIRouter()
    state = _detect()

    @router.get("/debug/pprof/")
    def index():
        if not settings.enable_pprof:
            raise HTTPException(status_code=404, detail="pprof disabled")
        return {
            "enabled": True,
            "endpoints": {
                "profile_html": "/debug/pprof/profile?seconds=10&format=html",
                "profile_text": "/debug/pprof/profile?seconds=10&format=text",
            },
            "pyinstrument_installed": state.pyinstrument_available,
        }

    @router.get("/debug/pprof/profile")
    def profile(seconds: int = 10, format: str = "html"):
        if not settings.enable_pprof:
            raise HTTPException(status_code=404, detail="pprof disabled")
        if not state.pyinstrument_available:
            raise HTTPException(
                status_code=500,
                detail="pyinstrument not installed. Install optional deps: `pip install -e .[profiling]`",
            )
        if seconds < 1 or seconds > 60:
            raise HTTPException(status_code=400, detail="seconds must be between 1 and 60")

        from pyinstrument import Profiler

        profiler = Profiler(interval=0.001, async_mode="enabled")
        profiler.start()
        import time

        time.sleep(seconds)
        profiler.stop()

        fmt = format.lower().strip()
        if fmt == "html":
            html = profiler.output_html()
            return Response(content=html, media_type="text/html; charset=utf-8")
        if fmt == "text":
            txt = profiler.output_text(unicode=True, color=False)
            return Response(content=txt, media_type="text/plain; charset=utf-8")

        raise HTTPException(status_code=400, detail="format must be one of: html, text")

    @router.get("/debug/pprof/healthz")
    def healthz():
        if not settings.enable_pprof:
            raise HTTPException(status_code=404, detail="pprof disabled")
        return {"ok": True}

    return router

