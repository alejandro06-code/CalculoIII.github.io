# Configuracion de Supabase

Proyecto:

- Project ID: `gilrvwphylcksoedmefx`
- Project URL: `https://gilrvwphylcksoedmefx.supabase.co`
- SQL Editor: https://supabase.com/dashboard/project/gilrvwphylcksoedmefx/sql/new
- Auth URL configuration: https://supabase.com/dashboard/project/gilrvwphylcksoedmefx/auth/url-configuration

Pasos obligatorios en Supabase:

1. Abrir el SQL Editor.
2. Copiar todo el contenido de `supabase/repair-user-profiles.sql`.
3. Ejecutar el SQL con Run. La cuenta principal queda protegida como:
   `maira2004hernandez@gmail.com`
4. En Authentication > URL Configuration, poner como Site URL:
   `https://alejandro06-code.github.io/CalculoIII.github.io/`
5. Agregar tambien como Redirect URL:
   `https://alejandro06-code.github.io/CalculoIII.github.io/`
6. En Authentication > Sign In / Providers, dejar habilitado Email.

Notas:

- Sin cuenta no se puede entrar al organizador.
- Los usuarios registrados sin perfil asignado no pueden entrar al contenido del organizador.
- Solo los correos registrados en `course_editors` pueden entrar, editar, guardar, subir archivos, abrir enlaces o descargar archivos segun su perfil.
- La cuenta principal y los perfiles `admin` pueden ver administracion e historial, pero solo la cuenta principal puede asignar perfiles, quitar permisos, sincronizar usuarios o borrar cuentas.
- Solo la cuenta principal `maira2004hernandez@gmail.com` puede eliminar entradas del historial.
- La tabla `course_editors` usa perfiles:
  - `owner`: cuenta principal fija.
  - `admin`: administra estructura, recursos y archivos; no cambia cuentas ni perfiles.
  - `manager`: edita recursos, estructura, archivos y puede borrar, pero no administra usuarios.
  - `contributor`: puede crear recursos y subir archivos, pero no borrar ni modificar la estructura.
  - `viewer`: solo lectura.
- Cada usuario debe registrarse desde la pagina con nombre, correo y contrasena.
- Para iniciar sesion puede usar correo o nombre de usuario, siempre con su contrasena.
- Los nombres de usuario aceptan espacios y deben ser unicos.
- Registrar una cuenta no da permiso por si solo; la cuenta principal debe asignar el perfil.
- Los datos de usuarios se guardan en Supabase Auth y en la tabla `user_profiles`, no en el repositorio.
- Los archivos se guardan en Supabase Storage, bucket `resource-files`.
- La pagina oficial es:
  `https://alejandro06-code.github.io/CalculoIII.github.io/`
