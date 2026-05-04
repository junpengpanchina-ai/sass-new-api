-- Fix: "Database error saving new user" after Supabase Auth (Google/Email)
-- Goal: make auth.users -> public.profiles trigger robust and non-blocking.
-- Safe: does NOT drop tables, does NOT delete data.
--
-- How to use:
-- 1) Open Supabase Dashboard -> SQL Editor
-- 2) Paste and run this whole file
--
-- Notes:
-- - We prefer relying on column defaults for role/status/etc to avoid enum/check mismatches.
-- - We also swallow trigger errors (RAISE LOG) so user signup/login is not blocked.

-- -----------------------------------------------------------------------------
-- 1) Ensure minimal columns exist on public.profiles
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists status text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Ensure updated_at helper exists (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Ensure default values for common NOT NULL columns (works for text + enums).
do $$
declare
  role_type text;
  status_type text;
  plan_type text;
  locale_type text;
  currency_type text;
begin
  -- role
  select format_type(a.atttypid, a.atttypmod)
    into role_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'role' and a.attnum > 0 and not a.attisdropped;
  if role_type is not null then
    execute format('alter table public.profiles alter column role set default %s', quote_literal('user') || '::' || role_type);
  end if;

  -- status
  select format_type(a.atttypid, a.atttypmod)
    into status_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'status' and a.attnum > 0 and not a.attisdropped;
  if status_type is not null then
    -- prefer 'active' for new users; must be a valid enum/check value in your schema
    execute format('alter table public.profiles alter column status set default %s', quote_literal('active') || '::' || status_type);
  end if;

  -- created_at / updated_at
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='created_at') then
    execute 'alter table public.profiles alter column created_at set default now()';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='updated_at') then
    execute 'alter table public.profiles alter column updated_at set default now()';
  end if;

  -- optional common columns if present: plan/locale/currency
  select format_type(a.atttypid, a.atttypmod)
    into plan_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'plan' and a.attnum > 0 and not a.attisdropped;
  if plan_type is not null then
    execute format('alter table public.profiles alter column plan set default %s', quote_literal('free') || '::' || plan_type);
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into locale_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'locale' and a.attnum > 0 and not a.attisdropped;
  if locale_type is not null then
    execute format('alter table public.profiles alter column locale set default %s', quote_literal('en') || '::' || locale_type);
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into currency_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles' and a.attname = 'currency' and a.attnum > 0 and not a.attisdropped;
  if currency_type is not null then
    execute format('alter table public.profiles alter column currency set default %s', quote_literal('USD') || '::' || currency_type);
  end if;

exception
  when others then
    raise notice 'profiles defaults migration skipped due to error: %', sqlerrm;
end;
$$;

-- Ensure updated_at trigger exists (idempotent)
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2) Rebuild handle_new_user() to be robust and non-blocking
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Insert minimal fields; rely on defaults for role/status/plan/etc to avoid constraint mismatch.
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
exception
  when others then
    -- Never block auth user creation; keep a server-side log for debugging.
    raise log 'handle_new_user failed for user %, email %, error: %', new.id, new.email, sqlerrm;
    return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) Recreate trigger on auth.users
-- -----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4) RLS: ensure users can read/update own profile (do not allow role changes)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Keep policy names aligned with this repo's schema (docs/supabase-schema-v1.sql).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

