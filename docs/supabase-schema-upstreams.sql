-- Upstreams + models mapping (V1 minimal, DB-driven "power strip")
-- Purpose: Admin can input base_url + api_key + models; gateway routes by model.
--
-- Notes:
-- - Store api_key encrypted (application-level). This schema provides columns;
--   encryption/rotation handled by your server code.
-- - V1 bring-up shortcut: you MAY store plaintext in api_key_enc to get the core chain working fast.
--   When moving to production, set UPSTREAM_SECRET_KEY and implement real encryption/decryption.
-- - RLS policies are omitted here for brevity; V1 can write via service role only.

create extension if not exists pgcrypto;

-- 1) Upstreams
create table if not exists public.upstreams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'openai_compatible',
  base_url text not null,
  -- encrypted secret blob + metadata (app-level encryption recommended)
  api_key_enc text not null,
  api_key_kid text null,
  status text not null default 'enabled', -- enabled | disabled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists upstreams_status_idx on public.upstreams(status);

-- 2) Models enabled per upstream
create table if not exists public.upstream_models (
  id bigserial primary key,
  upstream_id uuid not null references public.upstreams(id) on delete cascade,
  model text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (upstream_id, model)
);

create index if not exists upstream_models_enabled_idx on public.upstream_models(enabled);
create index if not exists upstream_models_model_idx on public.upstream_models(model);

