-- Ejecutar en Supabase SQL Editor para cerrar el acceso anonimo al contenido.

revoke select on public.course_state from anon;
grant select on public.course_state to authenticated;

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
  select public.current_course_role() in ('owner', 'admin', 'manager', 'editor');
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

grant execute on function public.can_access_course() to authenticated;
grant execute on function public.can_edit_course() to authenticated;
grant execute on function public.can_open_resource_assets() to authenticated;
grant execute on function public.can_delete_resource_assets() to authenticated;
grant execute on function public.can_manage_users() to authenticated;

drop policy if exists "course_state public read" on public.course_state;
drop policy if exists "course_state authenticated read" on public.course_state;
create policy "course_state authenticated read"
on public.course_state
for select
to authenticated
using (id = 'main' and public.can_access_course());

drop policy if exists "user_profiles own read" on public.user_profiles;
create policy "user_profiles own read"
on public.user_profiles
for select
to authenticated
using (id = auth.uid() or public.is_main_editor());

drop policy if exists "user_profiles own update" on public.user_profiles;
create policy "user_profiles own update"
on public.user_profiles
for update
to authenticated
using (id = auth.uid() or public.is_main_editor())
with check (id = auth.uid() or public.is_main_editor());

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
