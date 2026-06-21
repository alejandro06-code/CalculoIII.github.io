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

alter table public.course_state enable row level security;
alter table public.course_editors enable row level security;
alter table public.user_profiles enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.course_state to anon, authenticated;
grant insert, update on public.course_state to authenticated;
grant select on public.course_editors to authenticated;
grant insert, update, delete on public.course_editors to authenticated;
grant select, insert, update on public.user_profiles to authenticated;

drop policy if exists "user_profiles own read" on public.user_profiles;
create policy "user_profiles own read"
on public.user_profiles
for select
to authenticated
using (id = auth.uid() or public.is_course_editor());

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
using (id = auth.uid() or public.is_course_editor())
with check (id = auth.uid() or public.is_course_editor());

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

drop policy if exists "course_state public read" on public.course_state;
create policy "course_state public read"
on public.course_state
for select
to anon, authenticated
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
values ('resource-files', 'resource-files', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "resource_files public read" on storage.objects;
create policy "resource_files public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'resource-files');

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
