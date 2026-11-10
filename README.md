
# tecnologias_template_backend
=======
# Backend

Este repositorio contiene implementaciones de un API REST organizadas en tres ramas, cada una con una tecnología distinta:

- `template_node`: API desarrollada con Node.js.
- `template_php`: API desarrollada con PHP.
- `template_python`: API desarrollada con Python y Flask.

## Arquitectura

Las tres ramas organizan el API con una estructura basada en MVC, separando las responsabilidades en estas carpetas:

- `routes/`: define las rutas y los endpoints del API.
- `controllers/`: recibe las solicitudes y coordina la lógica de cada operación.
- `models/`: contiene el acceso y las operaciones sobre los datos.
- `database/`: agrupa la conexión y los recursos relacionados con la base de datos.

Esta separación facilita el mantenimiento y la organización de las operaciones REST, como consultar, crear, actualizar y eliminar registros.

## Rama `test_supa`

`test_supa` es una rama de prueba basada en la implementación PHP. Incluye un ejemplo para conectar con Supabase PostgreSQL y sincronizar datos desde `database/metas.json` hacia `public.products` mediante:

```sh
php database/sync_metas.php
```

La conexión se configura con variables de entorno (`DATABASE_URL` o `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_PORT`) y requiere SSL. No guardes contraseñas ni claves de Supabase en el repositorio.
 d9b30ac6e573fc255794e7a205f3633c0df5e926
