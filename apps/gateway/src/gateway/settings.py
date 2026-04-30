from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Server
    gateway_port: int = 8000

    # Dev auth (V1 core chain first)
    # Comma-separated plaintext tokens for local testing, e.g. "dev_token_1,dev_token_2"
    dev_tokens: str | None = None

    # Profiling - pprof-like endpoints
    enable_pprof: bool = False

    # Upstream (OpenAI-compatible)
    upstream_kind: str = "openai_compatible"
    upstream_base_url: str | None = None
    upstream_api_key: str | None = None

    # Supabase (DB-driven upstream config)
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    # Cache TTL for upstream config reads
    upstream_cache_ttl_seconds: int = 30

    # Secret encryption (V1: simple; later rotate with KID)
    upstream_secret_key: str | None = None

    # Aliases (optional) to match root .env example names
    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    UPSTREAM_CACHE_TTL_SECONDS: int | None = None
    UPSTREAM_SECRET_KEY: str | None = None

    def model_post_init(self, __context) -> None:  # type: ignore[override]
        # Allow either lower-case or upper-case env vars
        if not self.supabase_url and self.SUPABASE_URL:
            self.supabase_url = self.SUPABASE_URL
        if not self.supabase_service_role_key and self.SUPABASE_SERVICE_ROLE_KEY:
            self.supabase_service_role_key = self.SUPABASE_SERVICE_ROLE_KEY
        if self.UPSTREAM_CACHE_TTL_SECONDS is not None:
            self.upstream_cache_ttl_seconds = int(self.UPSTREAM_CACHE_TTL_SECONDS)
        if not self.upstream_secret_key and self.UPSTREAM_SECRET_KEY:
            self.upstream_secret_key = self.UPSTREAM_SECRET_KEY

    # Pyroscope (optional continuous profiling)
    pyroscope_url: str | None = None
    pyroscope_app_name: str | None = None
    pyroscope_basic_auth_user: str | None = None
    pyroscope_basic_auth_password: str | None = None
    pyroscope_mutex_rate: int | None = None
    pyroscope_block_rate: int | None = None
    hostname: str | None = None


def get_settings() -> Settings:
    return Settings()

