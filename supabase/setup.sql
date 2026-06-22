create table if not exists public.course_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.course_editors (
  email text primary key,
  role text not null default 'manager',
  created_at timestamptz not null default now()
);

alter table public.course_editors
add column if not exists role text not null default 'manager';

alter table public.course_editors
drop constraint if exists course_editors_role_check;

alter table public.course_editors
add constraint course_editors_role_check
check (role in ('owner', 'manager', 'contributor', 'viewer'));

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create unique index if not exists user_profiles_full_name_unique
on public.user_profiles (lower(full_name));

insert into public.course_editors (email, role)
values ('maira2004hernandez@gmail.com', 'owner')
on conflict (email) do update set role = 'owner';

create or replace function public.is_course_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_editors
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_main_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'maira2004hernandez@gmail.com';
$$;

create or replace function public.current_course_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.course_editors
      where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      limit 1
    ),
    'viewer'
  );
$$;

create or replace function public.can_edit_course()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_course_role() in ('owner', 'manager', 'contributor');
$$;

create or replace function public.email_for_login(login_identifier text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.user_profiles
  where lower(email) = lower(trim(login_identifier))
     or lower(full_name) = lower(trim(login_identifier))
  limit 1;
$$;

grant execute on function public.email_for_login(text) to anon, authenticated;

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
)
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
    updated_at = now();

alter table public.course_state enable row level security;
alter table public.course_editors enable row level security;
alter table public.user_profiles enable row level security;
alter table public.resource_audit_log enable row level security;

grant usage on schema public to anon, authenticated;
revoke select on public.course_state from anon;
grant select on public.course_state to authenticated;
grant insert, update on public.course_state to authenticated;
grant select on public.course_editors to authenticated;
grant insert, update, delete on public.course_editors to authenticated;
grant select, insert, update on public.user_profiles to authenticated;
grant select, insert on public.resource_audit_log to authenticated;

drop policy if exists "user_profiles own read" on public.user_profiles;
create policy "user_profiles own read"
on public.user_profiles
for select
to authenticated
using (id = auth.uid() or public.is_main_editor());

drop policy if exists "user_profiles own insert" on public.user_profiles;
create policy "user_profiles own insert"
on public.user_profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "user_profiles own update" on public.user_profiles;
create policy "user_profiles own update"
on public.user_profiles
for update
to authenticated
using (id = auth.uid() or public.is_main_editor())
with check (id = auth.uid() or public.is_main_editor());

drop policy if exists "course_editors editor read" on public.course_editors;
create policy "course_editors editor read"
on public.course_editors
for select
to authenticated
using (
  public.is_main_editor()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "course_editors editor insert" on public.course_editors;
create policy "course_editors editor insert"
on public.course_editors
for insert
to authenticated
with check (public.is_main_editor());

drop policy if exists "course_editors editor update" on public.course_editors;
create policy "course_editors editor update"
on public.course_editors
for update
to authenticated
using (public.is_main_editor())
with check (public.is_main_editor());

drop policy if exists "course_editors editor delete" on public.course_editors;
create policy "course_editors editor delete"
on public.course_editors
for delete
to authenticated
using (public.is_main_editor());

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

drop policy if exists "course_state public read" on public.course_state;
drop policy if exists "course_state authenticated read" on public.course_state;
create policy "course_state authenticated read"
on public.course_state
for select
to authenticated
using (id = 'main');

drop policy if exists "course_state authenticated insert" on public.course_state;
create policy "course_state authenticated insert"
on public.course_state
for insert
to authenticated
with check (id = 'main' and public.can_edit_course());

drop policy if exists "course_state authenticated update" on public.course_state;
create policy "course_state authenticated update"
on public.course_state
for update
to authenticated
using (id = 'main' and public.can_edit_course())
with check (id = 'main' and public.can_edit_course());

insert into public.course_state (id, data)
values (
  'main',
  $course$
{
  "course": {
    "title": "Calculo III",
    "description": "Organizador de recursos para construir y revisar un curso en Moodle."
  },
  "sections": [
    {
      "id": "preparacion",
      "title": "Preparacion",
      "description": "Recursos previos, recordatorios y materiales de entrada."
    },
    {
      "id": "profundizacion",
      "title": "Profundizacion",
      "description": "Lecturas, videos, enlaces y materiales para ampliar el tema."
    },
    {
      "id": "reto",
      "title": "Reto",
      "description": "Actividades, preguntas, problemas y evidencias de aprendizaje."
    },
    {
      "id": "cierre",
      "title": "Cierre",
      "description": "Autoevaluacion, sintesis y decisiones finales de la leccion."
    }
  ],
  "modules": [
    {
      "id": "m1",
      "title": "Funciones vectoriales y de varias variables",
      "lessons": [
        {
          "id": "l10",
          "title": "Introduccion a la asignatura",
          "resources": [
            {
              "id": "r1",
              "section": "preparacion",
              "title": "Video de bienvenida del curso",
              "type": "video",
              "status": "planned",
              "url": "",
              "links": [],
              "files": [],
              "owner": "Profesor",
              "priority": "high",
              "notes": "Definir duracion y mensaje inicial."
            },
            {
              "id": "r2",
              "section": "cierre",
              "title": "Encuesta diagnostica",
              "type": "quiz",
              "status": "missing",
              "url": "",
              "links": [],
              "files": [],
              "owner": "",
              "priority": "medium",
              "notes": "Pendiente decidir si va como cuestionario de Moodle o formulario externo."
            }
          ]
        },
        {
          "id": "l11",
          "title": "Funcion vectorial y funcion de varias variables",
          "resources": []
        },
        {
          "id": "l12",
          "title": "Limites y continuidad",
          "resources": []
        },
        {
          "id": "l13",
          "title": "Plano tangente",
          "resources": [
            {
              "id": "r3",
              "section": "profundizacion",
              "title": "Applet o enlace de visualizacion 3D",
              "type": "link",
              "status": "review",
              "url": "",
              "links": [],
              "files": [],
              "owner": "",
              "priority": "medium",
              "notes": "Buscar alternativa que pueda enlazarse desde Moodle."
            }
          ]
        }
      ]
    },
    {
      "id": "m2",
      "title": "Derivadas de funciones",
      "lessons": [
        {
          "id": "l21",
          "title": "Derivada direccional",
          "resources": []
        },
        {
          "id": "l22",
          "title": "Multiplicadores de Lagrange",
          "resources": []
        },
        {
          "id": "l23",
          "title": "Aplicaciones de la integral doble",
          "resources": []
        }
      ]
    },
    {
      "id": "m3",
      "title": "Integrales multiples",
      "lessons": [
        {
          "id": "l31",
          "title": "Integrales triples",
          "resources": []
        },
        {
          "id": "l32",
          "title": "Cambio de variables",
          "resources": []
        },
        {
          "id": "l33",
          "title": "Campos conservativos",
          "resources": []
        }
      ]
    },
    {
      "id": "m4",
      "title": "Calculo vectorial",
      "lessons": [
        {
          "id": "l41",
          "title": "Green y divergencia",
          "resources": []
        },
        {
          "id": "l42",
          "title": "Stokes",
          "resources": []
        }
      ]
    }
  ]
}
$course$::jsonb
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('resource-files', 'resource-files', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "resource_files public read" on storage.objects;
drop policy if exists "resource_files authenticated read" on storage.objects;
create policy "resource_files authenticated read"
on storage.objects
for select
to authenticated
using (bucket_id = 'resource-files' and public.can_edit_course());

drop policy if exists "resource_files authenticated upload" on storage.objects;
create policy "resource_files authenticated upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'resource-files' and public.can_edit_course());

drop policy if exists "resource_files authenticated update" on storage.objects;
create policy "resource_files authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id = 'resource-files' and public.can_edit_course())
with check (bucket_id = 'resource-files' and public.can_edit_course());

drop policy if exists "resource_files authenticated delete" on storage.objects;
create policy "resource_files authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'resource-files' and public.can_edit_course());
