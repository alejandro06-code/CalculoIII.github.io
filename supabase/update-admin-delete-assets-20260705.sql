-- Ejecutar en Supabase SQL Editor.
-- Alinea el perfil administrador para que pueda eliminar archivos/enlaces de recursos
-- igual que puede eliminar recursos, categorías y estructura desde la página.

create or replace function public.can_delete_resource_assets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_course_role() in ('owner', 'admin', 'manager', 'editor');
$$;

grant execute on function public.can_delete_resource_assets() to authenticated;
