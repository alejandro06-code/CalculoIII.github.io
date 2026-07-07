# Configuración de Supabase

Proyecto:

- Project ID: `gilrvwphylcksoedmefx`
- Project URL: `https://gilrvwphylcksoedmefx.supabase.co`
- SQL Editor: https://supabase.com/dashboard/project/gilrvwphylcksoedmefx/sql/new
- Auth URL configuration: https://supabase.com/dashboard/project/gilrvwphylcksoedmefx/auth/url-configuration

Pasos obligatorios en Supabase:

1. Abrir el SQL Editor.
2. Copiar todo el contenido de `supabase/setup.sql`.
3. Ejecutar el SQL con Run. El correo `maira2004hernandez@gmail.com` queda sembrado como primera cuenta principal, y luego cualquier cuenta principal puede asignar ese mismo perfil a otras cuentas.
4. En Authentication > URL Configuration, poner como Site URL:
   `https://alejandro06-code.github.io/CalculoIII.github.io/`
5. Agregar también como Redirect URL:
   `https://alejandro06-code.github.io/CalculoIII.github.io/`
6. En Authentication > Sign In / Providers, dejar habilitado Email.

Actualizacion de perfiles:

- Si la base de datos ya estaba creada y solo necesitas actualizar los perfiles nuevos, puedes ejecutar `supabase/update-role-permissions-20260701.sql` en lugar de repetir todo `setup.sql`.

Notas:

- Sin cuenta no se puede entrar al organizador.
- Los usuarios registrados sin perfil asignado no pueden entrar al contenido del organizador.
- Solo los correos registrados en `course_editors` pueden entrar, editar, guardar, subir archivos, abrir enlaces o descargar archivos según su perfil.
- Las cuentas principales y los perfiles `admin` pueden ver administración e historial, pero solo las cuentas principales pueden asignar perfiles, quitar permisos, sincronizar usuarios, borrar cuentas o eliminar historial.
- Solo una cuenta principal puede eliminar entradas del historial.
- La tabla `course_editors` usa perfiles:
  - `owner`: cuenta principal con acceso completo. Puede asignar también el perfil de cuenta principal a otra cuenta.
  - `admin`: administra configuración del curso, estructura, categorías y recursos; puede ver cuentas e historial, pero no cambia perfiles, no borra cuentas y no elimina historial.
  - `manager`: editor avanzado. Puede crear, editar, mover y eliminar recursos, pero no administra usuarios ni estructura.
  - `editor`: puede crear y editar recursos, pero no eliminar recursos completos.
  - `contributor`: creador de recursos. Puede crear recursos y subir archivos, pero no editar recursos existentes.
  - `advanced_viewer`: lector avanzado. Puede ver, abrir enlaces y descargar archivos.
  - `viewer`: lector. Puede ver, pero no abre enlaces ni descarga archivos.
  - Sin fila en `course_editors`: sin perfil asignado; no puede entrar al organizador.
- Cada usuario debe registrarse desde la página con nombre, correo y contraseña.
- Para iniciar sesión puede usar correo o nombre de usuario, siempre con su contraseña.
- Los nombres de usuario aceptan espacios y deben ser únicos.
- Registrar una cuenta no da permiso por si solo; la cuenta principal debe asignar el perfil.
- Los datos de usuarios se guardan en Supabase Auth y en la tabla `user_profiles`, no en el repositorio.
- Los archivos se guardan en Supabase Storage, bucket `resource-files`.
- La página oficial es:
  `https://alejandro06-code.github.io/CalculoIII.github.io/`
