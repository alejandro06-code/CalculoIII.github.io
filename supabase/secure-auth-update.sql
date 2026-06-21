-- Ejecutar en Supabase SQL Editor para cerrar el acceso anonimo al contenido.

revoke select on public.course_state from anon;
grant select on public.course_state to authenticated;

drop policy if exists "course_state public read" on public.course_state;
drop policy if exists "course_state authenticated read" on public.course_state;
create policy "course_state authenticated read"
on public.course_state
for select
to authenticated
using (id = 'main');

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
using (bucket_id = 'resource-files' and public.can_edit_course());
