-- Ejecutar en Supabase SQL Editor con la cuenta duena del proyecto.
-- Repara cuentas creadas en Supabase Auth que no aparecen en public.user_profiles.

create table if not exists public.resource_audit_log (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null,
  resource_title text not null default '',
  action text not null,
  actor_email text not null,
  actor_name text not null default '',
  module_id text not null default '',
  module_title text not null default '',
  lesson_id text not null default '',
  lesson_title text not null default '',
  section_id text not null default '',
  section_title text not null default '',
  summary text not null default '',
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.resource_audit_log
drop constraint if exists resource_audit_log_action_check;

alter table public.resource_audit_log
add constraint resource_audit_log_action_check
check (action in ('create', 'update', 'move', 'delete'));

create index if not exists resource_audit_log_resource_idx
on public.resource_audit_log (resource_id, created_at desc);

create index if not exists resource_audit_log_created_idx
on public.resource_audit_log (created_at desc);

alter table public.resource_audit_log enable row level security;

grant select, insert on public.resource_audit_log to authenticated;

drop policy if exists "resource_audit main read" on public.resource_audit_log;
create policy "resource_audit main read"
on public.resource_audit_log
for select
to authenticated
using (public.is_main_editor());

drop policy if exists "resource_audit editor insert" on public.resource_audit_log;
create policy "resource_audit editor insert"
on public.resource_audit_log
for insert
to authenticated
with check (
  public.can_edit_course()
  and lower(actor_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create or replace function public.profile_name_for_auth(auth_id uuid, auth_email text, raw_metadata jsonb)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  candidate := trim(coalesce(nullif(raw_metadata ->> 'full_name', ''), split_part(auth_email, '@', 1), auth_email));
  if candidate is null or candidate = '' then
    candidate := auth_email;
  end if;

  if exists (
    select 1
    from public.user_profiles
    where lower(full_name) = lower(candidate)
      and id <> auth_id
  ) then
    return auth_email;
  end if;

  return candidate;
end;
$$;

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null then
    return new;
  end if;

  insert into public.user_profiles (id, email, full_name, created_at, updated_at)
  values (
    new.id,
    lower(new.email),
    public.profile_name_for_auth(new.id, lower(new.email), new.raw_user_meta_data),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when public.user_profiles.full_name is null or public.user_profiles.full_name = ''
          then excluded.full_name
        else public.user_profiles.full_name
      end,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile on auth.users;
create trigger on_auth_user_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_profile();

create or replace function public.list_registered_accounts()
returns table (
  id uuid,
  email text,
  full_name text,
  profile_status text,
  email_confirmed boolean,
  role text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    au.id,
    lower(au.email) as email,
    coalesce(up.full_name, nullif(au.raw_user_meta_data ->> 'full_name', ''), split_part(au.email, '@', 1)) as full_name,
    case when up.id is null then 'missing_profile' else 'profile_ready' end as profile_status,
    au.email_confirmed_at is not null as email_confirmed,
    ce.role as role,
    au.created_at,
    coalesce(up.updated_at, au.updated_at) as updated_at
  from auth.users au
  left join public.user_profiles up on up.id = au.id
  left join public.course_editors ce on lower(ce.email) = lower(au.email)
  where public.is_main_editor()
    and au.email is not null
  order by au.created_at desc;
$$;

create or replace function public.registered_account_status(account_email text)
returns table (
  id uuid,
  email text,
  full_name text,
  profile_status text,
  email_confirmed boolean,
  role text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    au.id,
    lower(au.email) as email,
    coalesce(up.full_name, nullif(au.raw_user_meta_data ->> 'full_name', ''), split_part(au.email, '@', 1)) as full_name,
    case when up.id is null then 'missing_profile' else 'profile_ready' end as profile_status,
    au.email_confirmed_at is not null as email_confirmed,
    ce.role as role,
    au.created_at,
    coalesce(up.updated_at, au.updated_at) as updated_at
  from auth.users au
  left join public.user_profiles up on up.id = au.id
  left join public.course_editors ce on lower(ce.email) = lower(au.email)
  where public.is_main_editor()
    and lower(au.email) = lower(trim(account_email))
  limit 1;
$$;

create or replace function public.sync_registered_user_profiles()
returns integer
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  synced_count integer;
begin
  if not public.is_main_editor() then
    raise exception 'Solo la cuenta principal puede sincronizar usuarios.';
  end if;

  with raw_source as (
    select
      au.id,
      lower(au.email) as email,
      trim(coalesce(nullif(au.raw_user_meta_data ->> 'full_name', ''), split_part(au.email, '@', 1), au.email)) as candidate,
      au.created_at
    from auth.users au
    where au.email is not null
  ),
  prepared as (
    select
      raw_source.id,
      raw_source.email,
      case
        when count(*) over (partition by lower(raw_source.candidate)) > 1 then raw_source.email
        when exists (
          select 1
          from public.user_profiles up
          where lower(up.full_name) = lower(raw_source.candidate)
            and up.id <> raw_source.id
        ) then raw_source.email
        else raw_source.candidate
      end as full_name,
      raw_source.created_at
    from raw_source
  ),
  upserted as (
    insert into public.user_profiles (id, email, full_name, created_at, updated_at)
    select id, email, full_name, created_at, now()
    from prepared
    on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when public.user_profiles.full_name is null or public.user_profiles.full_name = ''
            then excluded.full_name
          else public.user_profiles.full_name
        end,
        updated_at = now()
    returning 1
  )
  select count(*) into synced_count from upserted;

  return synced_count;
end;
$$;

create or replace function public.delete_registered_account(account_email text)
returns void
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  normalized_email text;
  target_id uuid;
begin
  if not public.is_main_editor() then
    raise exception 'Solo la cuenta principal puede borrar cuentas.';
  end if;

  normalized_email := lower(trim(account_email));
  if normalized_email is null or normalized_email = '' then
    raise exception 'Correo invalido.';
  end if;

  if normalized_email = 'maira2004hernandez@gmail.com' then
    raise exception 'No se puede borrar la cuenta principal.';
  end if;

  select id
  into target_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  delete from public.course_editors
  where lower(email) = normalized_email;

  if target_id is not null then
    delete from public.user_profiles
    where id = target_id;

    delete from auth.users
    where id = target_id;
  else
    delete from public.user_profiles
    where lower(email) = normalized_email;
  end if;
end;
$$;

grant execute on function public.list_registered_accounts() to authenticated;
grant execute on function public.registered_account_status(text) to authenticated;
grant execute on function public.sync_registered_user_profiles() to authenticated;
grant execute on function public.delete_registered_account(text) to authenticated;

with raw_source as (
  select
    au.id,
    lower(au.email) as email,
    trim(coalesce(nullif(au.raw_user_meta_data ->> 'full_name', ''), split_part(au.email, '@', 1), au.email)) as candidate,
    au.created_at
  from auth.users au
  where au.email is not null
),
prepared as (
  select
    raw_source.id,
    raw_source.email,
    case
      when count(*) over (partition by lower(raw_source.candidate)) > 1 then raw_source.email
      when exists (
        select 1
        from public.user_profiles up
        where lower(up.full_name) = lower(raw_source.candidate)
          and up.id <> raw_source.id
      ) then raw_source.email
      else raw_source.candidate
    end as full_name,
    raw_source.created_at
  from raw_source
),
upserted as (
  insert into public.user_profiles (id, email, full_name, created_at, updated_at)
  select id, email, full_name, created_at, now()
  from prepared
  on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when public.user_profiles.full_name is null or public.user_profiles.full_name = ''
          then excluded.full_name
        else public.user_profiles.full_name
      end,
      updated_at = now()
  returning 1
)
select count(*) as perfiles_sincronizados from upserted;

select
  lower(au.email) as email,
  au.email_confirmed_at is not null as correo_confirmado,
  up.email is not null as aparece_en_usuarios_registrados,
  coalesce(up.full_name, au.raw_user_meta_data ->> 'full_name') as nombre_visible
from auth.users au
left join public.user_profiles up on up.id = au.id
where lower(au.email) = lower('alejandromendoza.at@gmail.com');
