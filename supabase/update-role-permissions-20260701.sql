-- Actualiza la matriz de perfiles del organizador.
-- Ejecutar en Supabase SQL Editor despues de publicar estos cambios.

alter table public.course_editors
add column if not exists role text not null default 'viewer';

alter table public.course_editors
alter column role set default 'viewer';

alter table public.course_editors
drop constraint if exists course_editors_role_check;

alter table public.course_editors
add constraint course_editors_role_check
check (role in ('owner', 'admin', 'manager', 'editor', 'contributor', 'advanced_viewer', 'viewer'));

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
    'unassigned'
  );
$$;

create or replace function public.can_access_course()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_course_role() in ('owner', 'admin', 'manager', 'editor', 'contributor', 'advanced_viewer', 'viewer');
$$;

create or replace function public.can_edit_course()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_course_role() in ('owner', 'admin', 'manager', 'editor', 'contributor');
$$;

create or replace function public.can_open_resource_assets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_course_role() in ('owner', 'admin', 'manager', 'editor', 'contributor', 'advanced_viewer');
$$;

create or replace function public.can_delete_resource_assets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_course_role() in ('owner', 'manager', 'editor');
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_course_role() in ('owner', 'admin');
$$;

grant execute on function public.current_course_role() to authenticated;
grant execute on function public.can_access_course() to authenticated;
grant execute on function public.can_edit_course() to authenticated;
grant execute on function public.can_open_resource_assets() to authenticated;
grant execute on function public.can_delete_resource_assets() to authenticated;
grant execute on function public.can_manage_users() to authenticated;

drop policy if exists "course_editors editor read" on public.course_editors;
create policy "course_editors editor read"
on public.course_editors
for select
to authenticated
using (
  public.can_manage_users()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "course_editors editor insert" on public.course_editors;
create policy "course_editors editor insert"
on public.course_editors
for insert
to authenticated
with check (
  public.is_main_editor()
  and role in ('owner', 'admin', 'manager', 'editor', 'contributor', 'advanced_viewer', 'viewer')
);

drop policy if exists "course_editors editor update" on public.course_editors;
create policy "course_editors editor update"
on public.course_editors
for update
to authenticated
using (
  public.is_main_editor()
  and (
    role <> 'owner'
    or public.owner_editor_count() > 1
  )
)
with check (
  public.is_main_editor()
  and role in ('owner', 'admin', 'manager', 'editor', 'contributor', 'advanced_viewer', 'viewer')
);

drop policy if exists "course_editors editor delete" on public.course_editors;
create policy "course_editors editor delete"
on public.course_editors
for delete
to authenticated
using (
  public.is_main_editor()
  and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', ''))
  and (
    role <> 'owner'
    or public.owner_editor_count() > 1
  )
);

drop policy if exists "resource_audit main read" on public.resource_audit_log;
create policy "resource_audit main read"
on public.resource_audit_log
for select
to authenticated
using (public.can_manage_users());

drop policy if exists "resource_audit editor insert" on public.resource_audit_log;
create policy "resource_audit editor insert"
on public.resource_audit_log
for insert
to authenticated
with check (
  public.can_edit_course()
  and lower(actor_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "resource_audit main delete" on public.resource_audit_log;
create policy "resource_audit main delete"
on public.resource_audit_log
for delete
to authenticated
using (public.is_main_editor());

drop policy if exists "course_state authenticated read" on public.course_state;
create policy "course_state authenticated read"
on public.course_state
for select
to authenticated
using (id = 'main' and public.can_access_course());

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

update storage.buckets
set public = false
where id = 'resource-files';

drop policy if exists "resource_files public read" on storage.objects;
drop policy if exists "resource_files authenticated read" on storage.objects;
create policy "resource_files authenticated read"
on storage.objects
for select
to authenticated
using (bucket_id = 'resource-files' and public.can_open_resource_assets());

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
using (bucket_id = 'resource-files' and public.can_delete_resource_assets());
