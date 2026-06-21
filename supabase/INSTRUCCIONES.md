# Configuracion de Supabase

Proyecto:

- Project ID: `gilrvwphylcksoedmefx`
- Project URL: `https://gilrvwphylcksoedmefx.supabase.co`
- SQL Editor: https://supabase.com/dashboard/project/gilrvwphylcksoedmefx/sql/new
- Auth URL configuration: https://supabase.com/dashboard/project/gilrvwphylcksoedmefx/auth/url-configuration

Pasos obligatorios en Supabase:

1. Abrir el SQL Editor.
2. Copiar todo el contenido de `supabase/setup.sql`.
3. Ejecutar el SQL con Run. El editor principal ya queda configurado como:
   `maira2004hernandez@gmail.com`
4. En Authentication > URL Configuration, poner como Site URL:
   `https://alejandro06-code.github.io/CalculoIII.github.io/`
5. Agregar también como Redirect URL:
   `https://alejandro06-code.github.io/CalculoIII.github.io/`
6. En Authentication > Sign In / Providers, dejar habilitado Email.

Notas:

- Sin cuenta no se puede entrar al organizador.
- Los usuarios registrados sin permiso pueden ver la estructura y los recursos, pero no pueden editar, abrir enlaces ni descargar archivos.
- Solo los correos registrados en `course_editors` podran editar, guardar, subir archivos, abrir enlaces y descargar archivos.
- Solo la cuenta principal `maira2004hernandez@gmail.com` puede ver la lista de editores, autorizar nuevos editores o quitar permisos.
- La tabla `course_editors` ahora usa perfiles:
  - `owner`: acceso completo para la cuenta principal.
  - `manager`: edita recursos, estructura, archivos y puede borrar, pero no administra usuarios.
  - `contributor`: puede crear recursos y subir archivos, pero no borrar ni modificar la estructura.
  - `viewer`: solo lectura.
- Cada usuario debe registrarse desde la pagina con nombre, correo y contrasena.
- Para iniciar sesion puede usar correo o nombre de usuario, siempre con su contrasena.
- Los nombres de usuario aceptan espacios y deben ser unicos.
- Registrar una cuenta no da permiso de editor por si solo; el correo debe estar autorizado desde la cuenta principal.
- Los datos de usuarios se guardan en Supabase Auth y en la tabla `user_profiles`, no en el repositorio.
- Los archivos se guardan en Supabase Storage, bucket `resource-files`.
- La pagina oficial sera:
  `https://alejandro06-code.github.io/CalculoIII.github.io/`
