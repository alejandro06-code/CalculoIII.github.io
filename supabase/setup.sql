create table if not exists public.course_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.course_editors (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.course_editors (email)
values ('maira2004hernandez@gmail.com')
on conflict (email) do nothing;

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

alter table public.course_state enable row level security;
alter table public.course_editors enable row level security;

drop policy if exists "course_editors editor read" on public.course_editors;
create policy "course_editors editor read"
on public.course_editors
for select
to authenticated
using (public.is_course_editor());

drop policy if exists "course_editors editor insert" on public.course_editors;
create policy "course_editors editor insert"
on public.course_editors
for insert
to authenticated
with check (public.is_course_editor());

drop policy if exists "course_editors editor delete" on public.course_editors;
create policy "course_editors editor delete"
on public.course_editors
for delete
to authenticated
using (public.is_course_editor());

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
with check (id = 'main' and public.is_course_editor());

drop policy if exists "course_state authenticated update" on public.course_state;
create policy "course_state authenticated update"
on public.course_state
for update
to authenticated
using (id = 'main' and public.is_course_editor())
with check (id = 'main' and public.is_course_editor());

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
with check (bucket_id = 'resource-files' and public.is_course_editor());

drop policy if exists "resource_files authenticated update" on storage.objects;
create policy "resource_files authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id = 'resource-files' and public.is_course_editor())
with check (bucket_id = 'resource-files' and public.is_course_editor());

drop policy if exists "resource_files authenticated delete" on storage.objects;
create policy "resource_files authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'resource-files' and public.is_course_editor());
