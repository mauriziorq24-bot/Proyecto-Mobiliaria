# API.md — Contrato del backend

Fuente: Swagger del backend (Spring Boot), revisado el 17/10/2026. Actualizado el 19/10/2026 (`tipoEspacio` y categorías) y el 20/10/2026 (nuevos endpoints de productos, categorías y citas; seed del backend; respuestas reales de la ficha de producto, probadas contra el backend vía ngrok). Desde el 20/10/2026 el backend está en producción en Render. Actualizado el 21/10/2026: **comportamiento real de autenticación probado con curl contra Render** (registro, duplicados, login, errores, contenido del JWT y qué endpoints exigen token). Ver [Comportamiento real de auth](#comportamiento-real-de-auth-probado-el-21102026). También el 21/10/2026: **citas probadas con curl** (respuesta de `POST`, `tipoAsesoria`, validaciones, zona horaria y seguridad de `PUT`/`DELETE`). Ver [Comportamiento real de citas](#comportamiento-real-de-citas-probado-el-21102026). Y el 21/10/2026, **respuestas del compañero** sobre citas: `fechaHora` en hora de Caracas, lista de `tipoAsesoria`, `400` para enum inválido y horario de atención (cierran los pendientes 11 y 11-bis). Actualizado el 22/10/2026: **favoritos** (`/api/v1/favoritos`), contrato del Swagger y prueba con curl; ver [Favoritos](#favoritos--apiv1favoritos). El mismo día el backend corrigió el pendiente 27 y se volvió a probar con curl. Actualizado el 26/10/2026: **administración de cotizaciones y citas** (`GET` y `PATCH`), contrato del Swagger comparado con nuestra propuesta y **probado con curl con una cuenta ADMIN y una normal**; ver [Administración de cotizaciones y citas](#administración-de-cotizaciones-y-citas-probado-el-26102026).
Swagger UI: `https://backendmobiliariodeoficina.onrender.com/swagger-ui/index.html` · Spec JSON: `https://backendmobiliariodeoficina.onrender.com/v3/api-docs` (en local: `http://localhost:8080/...`)

> Si este archivo y el Swagger no coinciden, **manda el Swagger**. Actualizar este archivo cuando cambie el backend.

## Datos generales

- **URL base:** `https://backendmobiliariodeoficina.onrender.com` en producción (Render), `http://localhost:8080` en local. Sin `/api`, porque hay dos prefijos: `/auth/v1` y `/api/v1`.
- **Cold start:** Render gratuito duerme el servidor tras un rato sin uso; la primera petición puede tardar hasta ~1 minuto. El frontend espera hasta 60 s (timeout de axios).
- **Autenticación:** JWT. Login, registro y Google devuelven `{ "token": "..." }` (login y Google con `200`, **registro con `201`**). Se envía como `Authorization: Bearer <token>`. El JWT solo contiene `sub` (username), `iss` y `exp` (~1 h); ver [Comportamiento real de auth](#comportamiento-real-de-auth-probado-el-21102026).
- **Formato:** JSON. Nombres de campos en **español y camelCase** (`nombre`, `precioReferencialUsd`).
- **Paginación:** no hay. `GET /api/v1/productos` devuelve el arreglo completo.

### Datos iniciales (seed del backend)

El backend tendrá un seed que carga:
- **Categorías (5):** `escritorios`, `silleria`, `comedores`, `peinadores`, `camillas` (ver [Categorías](#categorías--apiv1categorias)).
- **`tipoEspacio`:** `OFICINA`, `HOGAR`, `SALON_BELLEZA`, `CONSULTORIO` (ver [valores](#valores-de-tipoespacio)).
- **Imágenes de productos:** el plan es servirlas en `/uploads/productos/`, pero **hoy el seed trae URLs absolutas de Unsplash** (`https://images.unsplash.com/...`), que el navegador carga directamente sin pasar por el proxy (ver pendientes 4 y 19).
- **15 productos**, 3 por categoría, todos con `categoriaId` y `categoriaNombre` correctos.

---

## Auth — `/auth/v1`

### `POST /auth/v1/register`
```json
// Request
{ "username": "string", "password": "string", "email": "string" }
// Response 201 Created  (⚠️ es 201, no 200)
{ "token": "string" }
```
Registra al usuario y **devuelve el token ya iniciado** (no hace falta llamar a login después). Comportamiento real probado el 21/10/2026 (ver [tabla completa](#comportamiento-real-de-auth-probado-el-21102026)):
- Éxito → `201`.
- `username` o `email` repetido → **`401`** con cuerpo `text/plain` `Credenciales invalidas El nombre de usuario ya está en uso.` / `... El correo electrónico ya está registrado.` (debería ser `409` con JSON; ver pendiente 14-bis).
- Falta `email` (o body vacío) → **`500`**. Los tres campos son obligatorios; el frontend debe validarlos antes de enviar.
- **No valida formato de email ni longitud de contraseña:** `email: "noesemail"` y `password: "1"` se aceptan con `201`. Toda validación de formato/fuerza es responsabilidad del frontend por ahora.

### `POST /auth/v1/login`
```json
// Request — basta un identificador (username O email) + password; el campo email NO es obligatorio
{ "username": "string", "password": "string" }
// Response 200
{ "token": "string" }
```
Comportamiento real probado el 21/10/2026 (resuelve el pendiente 6):
- **Se entra con `username` o con `email`**, y el identificador puede ir indistintamente en el campo `username` o en `email`. Funcionan los tres: `{username,password}`, `{email,password}` y `{username:"<correo>",password}`. **El frontend puede mandar solo `{ username, password }`** (donde `username` es lo que escriba el usuario, sea su nombre o su correo). No hace falta mandar los dos campos como decía antes este contrato.
- El `username` es **insensible a mayúsculas** (`PRUEBA_FRONT_2110` entra igual).
- Si se manda un `email` junto al `username`, **se ignora** (entra aunque el email no coincida).
- **Contraseña incorrecta, usuario inexistente, o faltar la contraseña / body vacío → todos dan `403 Forbidden`** con JSON `{ "timestamp", "status":403, "error":"Forbidden", "path" }` (sin campo `message`). El frontend no puede distinguir "usuario no existe" de "contraseña mala" (está bien por seguridad): mostrar un único mensaje "Usuario o contraseña incorrectos".

### `POST /auth/v1/google`
```json
// Request: el ID token que entrega Google Identity Services en el frontend
{ "token": "string" }
// Response 200: JWT propio del backend
{ "token": "string" }
```

---

## Comportamiento real de auth (probado el 21/10/2026)

Probado con `curl` contra Render (solo lectura, sin tocar código). Usuario de prueba: `prueba_front_2110`.

### Registro y duplicados

| Caso | Código | Content-Type | Cuerpo |
|---|---|---|---|
| Registro válido | **`201`** | `application/json` | `{ "token": "..." }` |
| `username` repetido | **`401`** | `text/plain` | `Credenciales invalidas El nombre de usuario ya está en uso.` |
| `email` repetido (otro username) | **`401`** | `text/plain` | `Credenciales invalidas El correo electrónico ya está registrado.` |
| Falta `email` / body `{}` | **`500`** | `application/json` | error por defecto de Spring |
| `email` con formato inválido | **`201`** (lo acepta) | `application/json` | `{ "token": "..." }` |
| `password` de 1 carácter | **`201`** (lo acepta) | `application/json` | `{ "token": "..." }` |

### Login

| Caso | Código | Cuerpo |
|---|---|---|
| `username` + `password` | **`200`** | `{ "token": "..." }` |
| `email` + `password` | **`200`** | `{ "token": "..." }` |
| correo en el campo `username` + `password` | **`200`** | `{ "token": "..." }` |
| `username` + `password` + `email` ajeno | **`200`** (ignora el email) | `{ "token": "..." }` |
| `username` en mayúsculas | **`200`** (no distingue mayúsculas) | `{ "token": "..." }` |
| password incorrecta | **`403`** | `{ "status":403, "error":"Forbidden", ... }` (sin `message`) |
| usuario inexistente | **`403`** | ídem |
| solo `username` (sin password) / body `{}` | **`403`** | ídem |

### El JWT que devuelve el backend

Header: `{ "alg": "HS384" }`. Payload (base64, decodificable en el navegador):

```json
{ "sub": "prueba_front_2110", "iss": "mobiliariodeoficina-api", "exp": 1792560940 }
```

- **Solo trae `sub` (el username), `iss` y `exp`.** No trae `email` ni `rol`. → El frontend **no puede saber el rol ni el email** desde el token; necesita el pendiente 5 (`GET /auth/v1/me`). Si se usa el `sub`, es el nombre de usuario.
- **Actualización (23/10/2026):** el Swagger ya publica `GET /auth/v1/me`, pero falla (ver [Perfil y rol](#perfil-y-rol-get-authv1me-revisado-el-23102026)). El token sigue sin `rol`.
- **`exp` dura ~1 hora** (probado: `exp - now ≈ 3595 s`). Tras una hora el token caduca y el backend empezará a rechazar; el frontend debe manejar esa expiración (ver más abajo el ⚠️ del `500`).

**Qué es un JWT y por qué el frontend puede leerlo pero no modificarlo.** Un JWT (JSON Web Token) son tres partes separadas por puntos: `header.payload.firma`. El header y el payload son **solo JSON codificado en base64url** — no están cifrados, por eso el navegador (o cualquiera) puede decodificarlos y leer `sub`/`exp`. La tercera parte es una **firma**: el backend la calcula con el algoritmo `HS384` usando una **clave secreta que solo él conoce**. En cada petición el backend recalcula la firma del `header.payload` que recibe y la compara con la que viene; si no coincide, rechaza el token. Por eso, aunque el frontend podría cambiar el payload (p. ej. poner `"rol":"ADMIN"`), **no puede generar la firma correcta sin la clave secreta**, y el backend lo detectaría. Conclusión práctica: el frontend trata el contenido del JWT como **informativo** (mostrar el nombre, saber cuándo caduca), pero **la autorización real siempre la decide el backend**; nunca confiar en el token para dar o quitar permisos en el cliente.

### Perfil y rol: `GET /auth/v1/me` (revisado el 23/10/2026)

Aparece en el Swagger con respuesta `PerfilResponse`:

```json
{ "nombre": "string", "email": "string", "role": "ADMIN" }
```

- **El campo es `role` (en inglés), no `rol`.** El frontend lo usa tal cual. `role` viene del enum `ADMIN | USER` de la entidad `User`.
- **Probado con curl contra Render** (usuario `prueba_me_2310`, creado para la prueba y que sigue existiendo: no hay endpoint para borrar usuarios):
  | Caso | Respuesta |
  |---|---|
  | Sin token | `403` |
  | Con token válido (usuario normal) | **`500`** `{ "status":500, "error":"Internal Server Error" }` ❌ (pendiente 30) |
- **Cómo lo usa el frontend:** `authService.obtenerPerfil()`. El store de auth lo pide al abrir la app con sesión y al iniciar sesión; el rol sale del JWT si algún día lo trae (`rol` o `role`) y, si no, de `/me`. Si el JWT no trae el rol y `/me` falla, la persona queda como usuario normal. Desde el 26/10/2026 el JWT trae `rol`, así que el panel se abre aunque `/me` falle. `api.js` manda el token a `/auth/v1/me` (al resto de `/auth/v1` no).
- **Con mocks:** el usuario `admin` es `ADMIN`; `admin.limitado` también, pero los mocks de cotizaciones y citas para administración (`GET` y `PATCH`) le responden `403` (para ver el aviso de permisos del panel). Los demás son `USER`.
- Con un token de usuario normal, `GET /api/v1/cotizaciones` da **`403`** (probado el 23/10/2026): el backend sí protege los endpoints de administración por rol.
- **26/10/2026: el JWT ya trae el rol** en el claim `"rol"` (`{ "rol": "ADMIN", "sub": "…", "iss": "…", "exp": … }`) y el store de auth lo lee de ahí. Así el panel **sí se abre en producción** aunque `/me` siga dando `500`.

### Qué endpoints exigen token

| Endpoint | Sin token | Con token (usuario normal) |
|---|---|---|
| `GET /api/v1/productos` (y `?enShowroom`, `?tipoEspacio`, `?buscar`) | **`200` (público)** | `200` |
| `GET /api/v1/productos/{id}` | **`200` (público)** | `200` |
| `GET /api/v1/categorias` | **`200` (público)** | `200` |
| `POST`/`PUT /api/v1/productos` | `403` | **`403`** (un usuario normal tampoco puede: requiere rol admin — pendiente 8) |
| `POST /api/v1/categorias` | `403` | **`403`** (ídem — pendiente 15) |
| `POST /api/v1/citas` | `403` | **sí** (con token pasa auth; `400` si el JSON va mal) |
| `PUT`/`DELETE /api/v1/citas/{codigoCita}` | `403` | `200` con un código existente; `500` con uno inexistente (ver [citas](#comportamiento-real-de-citas-probado-el-21102026)) |
| `GET /api/v1/cotizaciones`, `PATCH /api/v1/cotizaciones/{codigo}` | `403` | **`403`** (solo `ADMIN`; probado el 26/10/2026) |
| `GET /api/v1/citas`, `PATCH /api/v1/citas/{codigoCita}` | `403` | **`403`** (solo `ADMIN`; probado el 26/10/2026) |

- **Las lecturas de catálogo (productos y categorías) son públicas:** la home, el catálogo y la ficha **no necesitan que el usuario esté logueado**.
- **⚠️ Agendar cita exige estar logueado.** `POST /api/v1/citas` da `403` sin token y pasa la autenticación con un token válido de usuario normal. Esto **contradice la idea de "agendar cita" como formulario público** (ver `CLAUDE.md`): o el usuario debe iniciar sesión antes de agendar, o hay que pedir al backend que `POST /api/v1/citas` sea público (ver pendiente 10-quater). Confirmar con el compañero.
- **Las escrituras de catálogo (`POST`/`PUT` productos, `POST` categorías) dan `403` incluso con un token válido de usuario normal:** parecen requerir rol admin, que el JWT actual no incluye (pendientes 8 y 15).
- **⚠️ Un token inválido o mal formado en un `GET` público da `500`, no `401`.** Mandar `Authorization: Bearer abc.def.ghi` a `GET /api/v1/productos` devuelve `500 Internal Server Error`. Esto es un problema para el frontend: el interceptor de axios espera que "token malo/vencido" sea `401` (para cerrar sesión y mandar al login, ver `CLAUDE.md`). Hoy un token vencido podría manifestarse como `500` en vez de `401` (ver pendiente 21-bis). ✅ **Aplicado en el frontend:** `api.js` no manda `Authorization` si no hay sesión, y tampoco si el token ya venció (cierra la sesión y la petición sale sin token).
- `GET /api/v1/categorias/{id}` responde `405 Method Not Allowed` (ese path existe en el spec solo para otros métodos, no para `GET`).

> Nota de limpieza: estas pruebas crearon en la base de datos de Render los usuarios `prueba_front_2110`, `prueba_front_2110b`, `prueba_front_2110d` y `prueba_front_2110e`, y las pruebas de citas crearon `prueba_citas_2110` (correo `prueba_citas_2110@example.com`). Si el compañero quiere, puede borrarlos del seed/BD. Las citas de prueba ya se borraron. El 22/10/2026, la prueba de favoritos creó `prueba_fav_2210` (correo `prueba_fav_2210@example.com`), sin favoritos guardados (todas las escrituras fallaron).

---

## Productos — `/api/v1/productos`

### `GET /api/v1/productos`
Query params (todos opcionales):

| Param | Tipo | Uso |
|---|---|---|
| `enShowroom` | boolean | Solo productos exhibidos en el showroom |
| `tipoEspacio` | string | Filtra por tipo de espacio (ver valores abajo) |
| `buscar` | string | Búsqueda por texto |

Response 200: arreglo de `ProductoResponse`.

#### Cómo se comporta `buscar` (probado con curl contra Render el 20/10/2026)

Busca el texto como **una sola subcadena** dentro del **`nombre`** del producto (equivale a un `LIKE '%texto%'`). Siempre responde `200`, aunque no haya resultados (`[]`).

| Pregunta | Resultado | Pruebas |
|---|---|---|
| ¿Ignora mayúsculas? | **Sí** | `silla`, `SILLA`, `Silla`, `sIlLa` → los mismos 3 (ids 4, 5, 6) |
| ¿Ignora tildes? | **Sí, en ambos sentidos** | `estacion` y `ESTACIÓN` → id 2 ("Estación…"); `ergonomica` → id 5; `barberia` → id 11; `sílla` y `cámilla` (con tilde de más) también encuentran |
| ¿En qué campos busca? | **Solo en `nombre`** | Solo en descripción (`lumbar`, `cerradura`) → `[]`. Solo en material (`aluminio`, `cromada`, `nogal`) → `[]`. Nombre de categoría (`Sillería`, `Peinadores`, `Camillas`) → `[]`. `tipoEspacio` (`OFICINA`, `HOGAR`) y dimensiones (`1.85m`) → `[]` |
| ¿Palabras parciales? | **Sí, en cualquier posición** | `sill` → 4, 5, 6; `escrit` → 1, 3; `amilla` → 13, 14, 15; `ll` → 6 productos |
| ¿Varias palabras? | **Solo si van seguidas y en ese orden** | `silla ejecutiva` → id 4; `silla malla` y `malla silla` → `[]` (no busca palabra por palabra) |
| `buscar=` vacío o solo espacios | **Devuelve todo el catálogo** (15) | `buscar=`, `buscar=%20`, `buscar=%20%20%20` → igual que sin el parámetro |
| ¿Recorta espacios (trim)? | **No** | `%20silla%20` → `[]` (ningún nombre tiene " silla "); `silla%20%20ejecutiva` (dos espacios) → `[]`; `%20ejecutiva` → id 4 porque el nombre sí contiene " Ejecutiva" |
| Caracteres `%` y `_` | **Funcionan como comodines de SQL** (no se escapan) | `%` y `_` → los 15; `s_lla` → 4, 5, 6; `s%a` → 9 productos |

Notas:
- `peluqueria`, `silleria` y `bano` devuelven `[]` con o sin tilde, pero porque **ningún nombre** contiene esas palabras ("Sillería" es solo nombre de categoría), no por un problema de tildes. La `ñ` no se pudo probar: ningún nombre del seed la tiene.
- Consecuencias para el frontend: conviene **recortar** el texto y **unir espacios repetidos** antes de enviarlo, y no mandar `buscar` si queda vacío. Buscar "sillería" o "lumbar" hoy no encuentra nada (ver pendiente 23).

> **Decisión del frontend (20/10/2026) para la página de búsqueda:** `?buscar=` existe pero **el frontend no lo usa**, porque solo busca en el `nombre` y como frase exacta (ver la tabla de arriba). `productoService` pide `GET /api/v1/productos` **sin parámetros, una sola vez** (la lista se reutiliza mientras se escribe y se cambian filtros), y en el navegador busca el texto palabra por palabra en `nombre`, `descripcion`, `material` y `categoriaNombre`, sin tildes ni mayúsculas; también filtra por categoría, `tipoEspacio`, `enShowroom` y precio, y ordena. Motivo: el catálogo es pequeño y no tiene paginación, así que filtrar en el navegador es más rápido y solo se espera el cold start de Render una vez. Si el catálogo crece y el backend agrega paginación, el servicio pasará a enviar el texto y los filtros a la API, sin cambiar las vistas. Ver pendientes 2, 22 y 26.

### `GET /api/v1/productos/{id}`
Response 200: un `ProductoResponse`.

Errores reales (probados el 20/10/2026; ver pendientes 20 y 21):

| Caso | Código | Content-Type | Cuerpo |
|---|---|---|---|
| `id` numérico que no existe (`99999`, `0`, `-1`) | **`500`** (debería ser `404`) | `application/json` | Error por defecto de Spring Boot (abajo) |
| `id` no numérico (`abc`, `1.5`) | **`401`** (debería ser `400`) | `text/plain` | `Credenciales invalidas For input string: "abc"` |

```json
// 500 cuando el id no existe (el campo "trace" trae el stack trace completo de Java; aquí recortado)
{
  "timestamp": "2026-10-20T22:41:46.894Z",
  "status": 500,
  "error": "Internal Server Error",
  "trace": "java.lang.RuntimeException: Producto no encontrado con ID: 99999\r\n\tat java27.backend...",
  "message": "Producto no encontrado con ID: 99999",
  "path": "/api/v1/productos/99999"
}
```

Qué hace el frontend mientras tanto:
- Los `id` que no son enteros los descarta `productoService` **sin llamar a la API** y los trata como "Producto no encontrado".
- El `500` de un `id` inexistente se muestra como error genérico ("No pudimos cargar este producto", con *Reintentar*). Cuando el backend responda `404`, la ficha mostrará "Producto no encontrado" sin cambiar nada más.

### `POST /api/v1/productos`
Crea un producto (uso administrativo). Body: `ProductoRequest` (igual a `ProductoResponse` sin `id` ni `categoriaNombre`).

### `PUT /api/v1/productos/{id}`
Actualiza un producto (uso administrativo). Body: `ProductoRequest` (el mismo de `POST`).

### `DELETE /api/v1/productos/{id}`
Elimina un producto (uso administrativo). **Estaba en el Swagger pero faltaba aquí** (revisado el 23/10/2026): responde `200` con un objeto de textos (`{ "clave": "texto" }`, el Swagger no dice cuáles). El frontend no lee el cuerpo. No se probó con curl (no tenemos una cuenta ADMIN).

### `ProductoRequest` según el Swagger (23/10/2026)
Obligatorios: `nombre`, `categoriaId`, `tipoEspacio`, `precioReferencialUsd`. Opcionales: `descripcion`, `enShowroom`, `material`, `dimensionesEstandar`, `imagenes`. El Swagger no da largos máximos; el formulario del panel usa los suyos (ver pendiente 31).

### Uso en el panel `/admin` (23/10/2026)
- Lista, crear, editar y eliminar en `/admin/productos` (`productoService`: `crearProducto`, `actualizarProducto`, `eliminarProducto`). Después de cada cambio se descarta la copia del catálogo que guarda la búsqueda (`invalidarCatalogo`).
- Un `400` se muestra junto al campo que nombre (ver pendiente 31). Un `403` da "No tienes permiso para esta acción." sin cerrar la sesión.
- **Con mocks:** los cambios se hacen sobre el arreglo de `src/mocks/productos.js` (la tienda los ve hasta recargar la página). El mock responde `400 { "message", "errores": { "nombre": "…" } }` si el nombre ya lo usa otro producto, solo para poder ver los errores por campo.
- **Imágenes nuevas:** URLs de jsDelivr del repositorio de fotos, `https://cdn.jsdelivr.net/gh/manuelperoza-prog/asets-mobiliario@main/{carpeta}/{archivo}` (`src/config/imagenes.js`). Las del seed usan `raw.githubusercontent.com` del mismo repositorio y siguen funcionando.

### `ProductoResponse`
```json
{
  "id": 1,
  "nombre": "Escritorio Modular tipo Bench para 4 personas",
  "descripcion": "Estación de trabajo optimizada con pasacables integrados y pantallas divisorias.",
  "categoriaId": 1,
  "categoriaNombre": "Escritorios",
  "tipoEspacio": "OFICINA",
  "precioReferencialUsd": 450,
  "enShowroom": true,
  "material": "Melamina 18mm con estructura metálica electrostática.",
  "dimensionesEstandar": "2.40m x 1.20m x 0.75m",
  "imagenes": ["/uploads/productos/escritorio-bench.jpg"]
}
```
> Hoy `imagenes` trae URLs absolutas de Unsplash, no rutas `/uploads/...`. El frontend usa cada valor tal cual en `<img src>`, así que acepta ambas formas. `precioReferencialUsd` llega con decimales (`480.00`), como número JSON.

### Valores de `tipoEspacio`

| Valor | Texto en la UI |
|---|---|
| `OFICINA` | Oficina |
| `HOGAR` | Hogar |
| `SALON_BELLEZA` | Salón de belleza |
| `CONSULTORIO` | Consultorio |

Estos cuatro valores están **confirmados** (son los del seed del backend). Por ahora se documenta como **un solo string** por producto (ver pendientes: podría pasar a ser lista).

Notas:
- `precioReferencialUsd` es **referencial**: mostrar como "Precio referencial" / "Desde $450", no como precio final.
- Sin campo `stock` ni `slug` en productos: las rutas del frontend usan el `id` (`/producto/:id`).

---

## Categorías — `/api/v1/categorias`

### `GET /api/v1/categorias`
```json
[
  { "id": 2, "nombre": "Sillería", "slug": "silleria", "descripcion": "string" }
]
```

### `POST /api/v1/categorias`
Crea una categoría (uso administrativo).
```json
// Request
{ "nombre": "string", "descripcion": "string" }
```
El `slug` **lo genera el backend** a partir del `nombre`: lo pasa a minúsculas, quita las tildes y cambia los espacios por guiones. Probado: `"Sillería Ergonómica"` → `silleria-ergonomica`.

Categorías (las carga el seed del backend):

| Nombre | Slug |
|---|---|
| Escritorios | `escritorios` |
| Sillería | `silleria` |
| Comedores | `comedores` |
| Peinadores | `peinadores` |
| Camillas | `camillas` |

Los `id` los asigna el backend: el frontend no debe depender de ellos (rutas por `slug`, lista desde `GET /api/v1/categorias`).

### `PUT /api/v1/categorias/{id}` y `DELETE /api/v1/categorias/{id}`
**Estaban en el Swagger pero faltaban aquí** (revisado el 23/10/2026). No se probaron con curl (no tenemos una cuenta ADMIN).
- `PUT`: body `CategoriaRequest` (`{ nombre, descripcion }`; solo `nombre` es obligatorio) → `200` con `CategoriaResponse`.
- `DELETE`: `200` con un objeto de textos (`{ "clave": "texto" }`), como el de productos. El frontend no lee el cuerpo.
- No hay `GET /api/v1/categorias/{id}` (da `405`): el formulario de editar busca la categoría en la lista.

### Uso en el panel `/admin` (23/10/2026)
- Lista, crear, editar y eliminar en `/admin/categorias` (`categoriaService`: `crearCategoria`, `actualizarCategoria`, `eliminarCategoria`). La cantidad de productos de cada una **no la da la API**: se cuenta con `GET /api/v1/productos` (por `categoriaId`).
- **El slug no se envía nunca.** El formulario lo muestra de solo lectura; al crear, como vista previa con la regla de arriba.
- **Eliminar una categoría con productos:** el panel no lo intenta; avisa y ofrece ver esos productos. Si el backend igual la rechaza (el conteo estaba viejo), el frontend reconoce un `409`, o un `400`/`500` cuyo `message` hable de productos o de la clave foránea, muestra el `message` del backend y vuelve a contar (pendiente 32).
- Un `400` con campos se muestra junto a cada uno; un `409` al guardar se muestra junto al nombre (pendiente 14). Un `403` da "No tienes permiso para esta acción." sin cerrar la sesión.
- **Con mocks:** los cambios se hacen sobre el arreglo de `src/mocks/categorias.js` (y renombrar cambia el `categoriaNombre` de sus productos en `src/mocks/productos.js`). El mock responde `409 { "message" }` a un nombre cuyo slug ya existe y a eliminar una categoría con productos.

---

## Citas — `/api/v1/citas`

### `POST /api/v1/citas`
Agendar una visita o asesoría.
```json
// Request
{
  "nombreCliente": "string",
  "empresa": "string",
  "telefono": "string",
  "email": "string",
  "fechaHora": "2026-10-17T22:41:40.820Z",
  "tipoAsesoria": "string",
  "notas": "string"
}
// Response 201 Created  (⚠️ es 201, no 200 como dice el Swagger)
{ "codigoCita": "CITA-728BF4", "mensaje": "Cita agendada con éxito" }
```
- **Exige token** (`403` sin él).
- **Obligatorios** (según el spec): `nombreCliente`, `telefono`, `email`, `fechaHora`, `tipoAsesoria`. `empresa` y `notas` son opcionales.
- **`codigoCita`:** `CITA-` + 6 caracteres hexadecimales en mayúsculas (p. ej. `CITA-C531B1`). Parecen aleatorios, no secuenciales. **El frontend debe mostrarlo y guardarlo**: es la única forma de modificar o cancelar la cita después (no hay `GET`).
- **`tipoAsesoria`:** enum de Java (`TipoAsesoria`) que **no aparece en el Swagger** (sale como `string`). **Valores confirmados por el backend (21/10/2026):** `VISITA_SHOWROOM`, `COTIZACION_GENERAL`, `PROYECTO_CORPORATIVO`, `DISENO_DE_ESPACIOS`, `RETIRO_DE_COMPRA`. Un valor inválido da **`400`** (antes daba `401`). En el frontend, las etiquetas en español viven en un solo mapa de `src/utils/formato.js`.
- **`fechaHora`: hora local de Caracas sin zona** (`"2026-11-20T14:30:00"`). **Confirmado (21/10/2026):** en Java es `LocalDateTime` y en la BD una columna `DATETIME`. **No usar `toISOString()`** (ver [Zonas horarias](#zonas-horarias-en-fechahora)).
- **Horario de atención confirmado (21/10/2026):** lunes a viernes 8:30–17:00, sábados 8:30–13:30 (coincide con `src/config/empresa.js`).

### `PUT /api/v1/citas/{codigoCita}`
Modifica una cita. Body: `CitaRequest` (el mismo de `POST`). Respuesta: `200 { "mensaje": "Cita modificada con éxito" }` (no devuelve la cita).

### `DELETE /api/v1/citas/{codigoCita}`
Cancela (elimina) una cita. Respuesta: `200 { "mensaje": "Cita eliminada con éxito" }`.

### Citas para administración

✅ Publicado el 26/10/2026 (cierra el pendiente 29). Contrato y pruebas en [Administración de cotizaciones y citas](#administración-de-cotizaciones-y-citas-probado-el-26102026). La sección Citas del panel lo usa con `VITE_ADMIN_CITAS_API=true`.

### Comportamiento real de citas (probado el 21/10/2026)

Probado con `curl` contra Render con el usuario `prueba_citas_2110`. **Las 5 citas creadas se borraron al terminar** (un segundo `DELETE` dio `500`: ya no existen).

**`POST /api/v1/citas`**

| # | Caso | Código | Cuerpo |
|---|---|---|---|
| 1 | Válida, `fechaHora: "2026-11-20T14:30:00"` (sin `Z`) | **`201`** | `{ "codigoCita": "CITA-728BF4", "mensaje": "Cita agendada con éxito" }` |
| 2 | Igual, pero `"2026-11-20T14:30:00Z"` (con `Z`) | **`201`** | `{ "codigoCita": "CITA-C531B1", ... }` (la acepta) |
| 2b | `"2026-11-20T14:30:00-04:00"` (offset de Venezuela) | **`400`** | error por defecto de Spring, sin `message` |
| 3 | `tipoAsesoria: "XYZ"` | ~~`401` `text/plain`~~ → **`400`** (corregido por el backend el 21/10/2026, según el compañero; no se volvió a probar con curl) | antes: `Credenciales invalidas No enum constant …TipoAsesoria.XYZ` |
| 4 | Fecha pasada (`2020-01-15T10:00:00`) | **`400`** | sin `message` (no dice por qué) |
| 5a | Domingo (`2026-11-22T11:00:00`) | **`201`** (la acepta) | `{ "codigoCita": ... }` |
| 5b | Jueves a las 22:00 | **`201`** (la acepta) | `{ "codigoCita": ... }` |
| 5c | `fechaHora` mal formada (`"20-11-2026"`) | **`400`** | sin `message` |
| 5d | Falta `telefono` | **`400`** | sin `message` |
| 6 | Sin token | **`403`** | `{ "status":403, "error":"Forbidden", ... }` |
| — | Misma franja dos veces (prueba 1 y 2: 20/11 14:30) | **`201`** las dos | no detecta citas solapadas |

**`PUT` / `DELETE /api/v1/citas/{codigoCita}`**

| # | Caso | Código |
|---|---|---|
| 7 | `DELETE /api/v1/citas/CODIGO-INVENTADO` con token | **`500`** (no `404`). Igual con `CITA-000000` |
| 8 | `DELETE` de una cita propia **sin token** | **`403`**: la rechaza, no la borra |
| — | `DELETE` de una cita propia con token | `200 { "mensaje": "Cita eliminada con éxito" }` |
| — | `PUT` sin token | `403` |
| — | `PUT` con token | `200 { "mensaje": "Cita modificada con éxito" }` |
| — | `PUT` con código inexistente | `500` |
| — | `GET /api/v1/citas/{codigoCita}` | `403` (no existe; pendiente 16) |

**Validaciones del backend, resumen:**
- ✅ Campos obligatorios, formato de fecha y **fecha en el pasado** → `400` (pero sin mensaje: el frontend no puede saber cuál falló). Desde el 21/10/2026 el backend corre en zona `America/Caracas`, así que "en el pasado" se compara con la hora de Caracas.
- ❌ **No valida horario de atención** (acepta domingos y 22:00) ni **citas solapadas** en la misma franja (probado el 21/10/2026; no se ha confirmado que cambiara). El frontend es la barrera: ofrece solo días y horas hábiles.
- ✅ `tipoAsesoria` inválido da **`400`** (antes `401`, que el interceptor habría tomado como sesión vencida). Igual, el frontend manda solo los valores conocidos.
- ❌ Código inexistente en `PUT`/`DELETE` da `500` en vez de `404`.

**Seguridad de `PUT`/`DELETE`:** ambos **exigen token** (`403` sin él), así que un visitante anónimo no puede tocar citas aunque conozca el código. **No se probó si un usuario puede modificar o borrar la cita de *otro* usuario** (haría falta una segunda cuenta). Si el backend solo comprueba "hay token válido" y no "esta cita es tuya", cualquier usuario registrado que adivine o vea un `codigoCita` (16,7 millones de combinaciones) podría cambiarla o borrarla. Ver pendiente 17.

### Zonas horarias en `fechaHora`

**Confirmado por el compañero (21/10/2026):** el campo es un **`LocalDateTime`** (columna `DATETIME`) y guarda la **hora de Caracas sin zona**. El backend corre en `America/Caracas`. Acepta `14:30:00` y `14:30:00Z` (Jackson descarta la `Z`), pero **rechaza `14:30:00-04:00`**.

Consecuencia: si el frontend usara `new Date(...).toISOString()`, una cita a las **10:30 en Caracas (UTC−4)** se enviaría como `"…T14:30:00.000Z"` y se guardaría **14:30**, con 4 horas de diferencia. Por eso el frontend **envía la hora local tal cual, sin `Z`** (`"2026-11-20T10:30:00"`), construyendo el string a mano desde el selector de fecha y hora, sin pasar por `toISOString()`. Propuesta aprobada (cierra el pendiente 11-bis).

---

## Cotizaciones — `/api/v1/cotizaciones`

> ✅ **Publicado por el backend y probado con curl (21/10/2026).** El frontend lo usa con `VITE_COTIZACION_API=true` (ver `CLAUDE.md`); con los mocks responde `src/mocks/cotizaciones.js`.
>
> Resultados de la prueba: cuerpo válido → `201 {"codigoCotizacion":"COT-0001"}` (el código es **secuencial**). `400` (cuerpo vacío, sin detalle de qué falló) con: `{}`, `items: []`, `productoId` inexistente, `cantidad: 0`, `nombreCliente` en blanco, email o teléfono con formato inválido. El Swagger dice `200`, pero responde `201`.
>
> `GET /api/v1/cotizaciones` y `PATCH /api/v1/cotizaciones/{codigo}` (solo `ADMIN`) los usa el panel `/admin`: ver [Administración de cotizaciones y citas](#administración-de-cotizaciones-y-citas-probado-el-26102026).

### `POST /api/v1/cotizaciones`

**Público, sin token** (no hace falta cuenta para cotizar).

```json
{
  "nombreCliente": "string",
  "empresa": "string (opcional)",
  "telefono": "string",
  "email": "string",
  "notas": "string (opcional)",
  "items": [{ "productoId": 1, "cantidad": 3 }]
}
```

**Respuesta `201`:**

```json
{ "codigoCotizacion": "COT-XXXX" }
```

**Errores:** `400` si falta un campo, si un `productoId` no existe o si la `cantidad` es menor que 1.

- **El frontend nunca envía precios:** el backend los calcula con el `productoId`. El total que ve la persona es referencial.
- El frontend envía solo los productos que siguen en el catálogo, con cantidades de 1 a 99, y el teléfono en formato `+58…` (como en citas).
- Los campos opcionales vacíos no se envían.

---

## Administración de cotizaciones y citas (probado el 26/10/2026)

Publicado por el backend el 26/10/2026. Contrato leído de `/v3/api-docs` y probado con `curl` contra Render con una cuenta `ADMIN` y una `USER`. Lo usa el panel `/admin` (secciones Cotizaciones y Citas, y el Resumen).

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| `GET` | `/api/v1/cotizaciones` | — | `200 [Cotizacion]` |
| `PATCH` | `/api/v1/cotizaciones/{codigo}` | `{ "estado": "CONTACTADO" }` | `200 { "mensaje": "Estado de la cotización actualizado a CONTACTADO" }` |
| `GET` | `/api/v1/citas` | — | `200 [CitaResponse]` (desde el 26/10/2026; antes, la entidad `CitaShowroom`) |
| `PATCH` | `/api/v1/citas/{codigoCita}` | `{ "estado": "CONFIRMADA" }` | `200 { "mensaje": "Estado de la cita actualizado a CONFIRMADA" }` |

- **Estados de cotización:** `PENDIENTE` | `CONTACTADO` | `CANCELADA` (ojo: `CONTACTADO` en masculino).
- **Estados de cita:** `PENDIENTE` | `CONFIRMADA` | `COMPLETADA` | `CANCELADA`.
- El `PATCH` **no devuelve** el objeto actualizado, solo `{ mensaje }`. El panel ya lo cambió en pantalla (actualización optimista) y lo revierte si falla.
- Las etiquetas en español de los estados viven en `src/utils/formato.js` (`ESTADOS_COTIZACION`, `ESTADOS_CITA`).

### Diferencias con lo que propusimos

| | Propuesta | Backend real |
|---|---|---|
| Rutas | `GET`/`PATCH /api/v1/cotizaciones/{codigo}` y `GET`/`PATCH /api/v1/citas/{codigoCita}` | ✅ Iguales. (Antes se había anotado `PATCH /api/v1/cotizaciones/{id}/estado`: ya no existe.) |
| Body del `PATCH` | `{ "estado" }` | ✅ Igual (`EstadoCotizacionRequest`, `EstadoCitaRequest`) |
| Estado final de una cita | `ATENDIDA` | **`COMPLETADA`**. Se usa la del backend. |
| `GET /api/v1/citas` | DTO con `codigoCita`, `nombreCliente`, `email`, `empresa`, `telefono`, `fechaHora`, `tipoAsesoria`, `estado`, `notas`, `creadoEn` | Al principio, la **entidad** `CitaShowroom` con el `User` completo **y su `password`**. ✅ **Corregido el mismo 26/10/2026:** ahora es `CitaResponse`, igual a la propuesta (pendiente 33), salvo que `creadoEn` llega en `null` (pendiente 36) |
| Respuesta del `PATCH` | — | `{ mensaje }` |

### Forma real (curl)

`Cotizacion` = `{ id, codigoCotizacion, nombreCliente, empresa, telefono, email, notas, totalUsd, fechaCreacion, estado, detalles: [{ id, producto, cantidad, precioUnitario }] }`. `producto` es la **entidad** `Producto` (`categoria` como objeto, `imagenes` como `[{ id, urlImagen }]` y algún `"hibernateLazyInitializer": {}` suelto), no `ProductoResponse`. `fechaCreacion` viene sin zona: `"2026-10-21T23:31:49.453401"` (pendiente 34). El mock (`src/mocks/cotizaciones.js`) sigue esta forma.

`CitaResponse` (también en `GET /api/v1/citas/mis-citas`), probado con curl después del arreglo:

```json
{
  "codigoCita": "CITA-BE74C1",
  "nombreCliente": "Manuel",
  "email": "…",
  "empresa": "UJAP",
  "telefono": "+584245733046",
  "fechaHora": "2026-10-30T14:00:00",
  "tipoAsesoria": "VISITA_SHOWROOM",
  "estado": "PENDIENTE",
  "notas": null,
  "creadoEn": null
}
```

**Cómo lo usa el frontend:** `citaService.obtenerCitasAdmin()` arma cada cita **campo por campo** (`aCitaAdmin`) y le agrega `fecha` y `hora` de Caracas, separadas de `fechaHora` con `src/utils/fecha.js`, para la agenda. Con `creadoEn` en `null`, el detalle simplemente no muestra "Agendada el …". El mock (`src/mocks/citas.js`) tiene la forma de `CitaResponse`.

### Resultados de la prueba

| Endpoint | `ADMIN` | `USER` | Sin token |
|---|---|---|---|
| `GET /api/v1/cotizaciones` | `200` | `403` | `403` |
| `GET /api/v1/citas` | `200` | `403` | `403` |
| `PATCH /api/v1/cotizaciones/{codigo}` | `200` (el `GET` lo refleja) | `403` | — |
| `PATCH /api/v1/citas/{codigoCita}` | `200` (el `GET` lo refleja) | `403` | — |
| `PATCH` con un código inexistente (`COT-9999`, `CITA-000000`) | Al principio **`500`** en los dos. Después del arreglo: citas **`404`** ✅, cotizaciones sigue en **`500`** (pendiente 35) | — | — |
| `PATCH` con un estado inválido (`ATENDIDA`) | `400`, con un mensaje que habla de "tipoAsesoria o la fecha" (pendiente 35) | — | — |

- Nadie recibió `401` con un token válido, y el usuario normal recibe `403` (no `401`) en los cuatro: el panel muestra "No tienes permiso para esta acción." sin cerrar la sesión.
- Los cambios de la prueba se revirtieron: `COT-0001` y `CITA-BE74C1` quedaron en `PENDIENTE`, como estaban.

## Favoritos — `/api/v1/favoritos`

> ✅ **Publicado y probado con curl en producción (22/10/2026), después de que el backend corrigiera el pendiente 27** (ver [prueba](#comportamiento-real-de-favoritos-probado-el-22102026)). El frontend lo usa solo con `VITE_FAVORITOS_API=true` y sesión iniciada (ver `CLAUDE.md`); con los mocks responde `src/mocks/favoritos.js`.

**Los tres exigen token** y trabajan sobre los favoritos del usuario del token.

| Método | Ruta | Respuesta real (probada el 22/10/2026) |
|---|---|---|
| `GET` | `/api/v1/favoritos` | `200` · arreglo de ids de productos (`int64`): `[16, 17]` |
| `POST` | `/api/v1/favoritos/{productoId}` | `204` sin cuerpo (el Swagger dice `200`) |
| `DELETE` | `/api/v1/favoritos/{productoId}` | `204` sin cuerpo (el Swagger dice `200`) |

- El frontend trata **cualquier `2xx`** como éxito, así que da igual si el backend responde `200` o `204`.
- `POST` y `DELETE` son **idempotentes** (comprobado): guardar dos veces no duplica y quitar uno que no está responde `204`.
- Nombres y forma del producto: el `GET` devuelve **solo ids**; el frontend busca nombre, precio y fotos en `GET /api/v1/productos`.

### Diferencias con la propuesta que le hicimos

| | Propuesta | Backend (Swagger) |
|---|---|---|
| Rutas | `GET /api/v1/favoritos`, `POST`/`DELETE /api/v1/favoritos/{productoId}` | **Iguales** |
| `GET` | `[1, 4, 7]` | **Igual** (arreglo de enteros) |
| `POST` / `DELETE` | `204` | **`204`** sin cuerpo (el Swagger dice `200`) |
| Sin token | `401` | **`403`** (como el resto de endpoints protegidos) |
| Producto inexistente | `404` | **`404`** (no documentado en el Swagger) |

### Comportamiento real de favoritos (probado el 22/10/2026)

**Segunda prueba, después del arreglo del pendiente 27.** Probado con curl contra Render, con un usuario real que inicia sesión con su correo (el `sub` del JWT es el username). La lista estaba vacía al empezar y quedó vacía al terminar. Su token funciona en otros endpoints protegidos (`GET /api/v1/cotizaciones/mis-cotizaciones` → `200 []`).

| Petición (en orden) | Sin token | Con token válido |
|---|---|---|
| `GET /api/v1/favoritos` | `403` | `200` `[]` |
| `POST /api/v1/favoritos/16` (existe), dos veces | `403` | `204` y `204` ✅ |
| `POST /api/v1/favoritos/17` | — | `204` |
| `GET /api/v1/favoritos` | — | `200` `[16,17]` ✅ (solo ids, sin duplicar el 16) |
| `DELETE /api/v1/favoritos/16`, dos veces | `403` | `204` y `204` ✅ |
| `GET /api/v1/favoritos` | — | `200` `[17]` |
| `POST`/`DELETE /api/v1/favoritos/99999` (no existe) | — | `404` ✅ (error JSON por defecto de Spring, sin `message`) |
| `POST /api/v1/favoritos/abc` | — | `401` `text/plain` "Credenciales invalidas For input string: "abc"" (pendiente 21) |
| `GET /api/v1/favoritos` con `Bearer abc.def.ghi` | — | `500` (pendiente 21-bis) |

- **Ojo, los ids del catálogo cambiaron:** hoy empiezan en **16**, y `GET /api/v1/productos/1` da `500` (pendiente 20). Por eso `POST /api/v1/favoritos/1` responde `404`: ese producto ya no existe.
- Los dos últimos casos no son propios de favoritos: siguen abiertos en los pendientes 21 y 21-bis. No afectan al frontend, porque solo manda ids del catálogo y no envía tokens vencidos.

Primera prueba (22/10/2026, antes del arreglo, usuario `prueba_fav_2210`): `GET` con un token válido daba `401`, y `POST`/`DELETE` daban `500` aunque el producto existiera.

---

## ⚠️ Pendientes con el backend

### Bloquean funcionalidades del plan
1. ~~**Carrito, favoritos y pedidos:** no existen endpoints.~~ ✅ **Decidido (21/10/2026):** opción B; carrito y pedidos no tendrán endpoints. Favoritos sí tiene endpoint (pendiente 27 cerrado el 22/10/2026). Las opciones que se plantearon:
   - **Opción A:** el backend los crea (`/api/v1/carrito`, `/api/v1/favoritos`, `/api/v1/pedidos`).
   - **Opción B:** carrito y favoritos viven en el frontend (Pinia + localStorage) y el "checkout" se convierte en **solicitud de cotización** (vía cita, WhatsApp o un endpoint `POST /api/v1/cotizaciones`). Encaja con `precioReferencialUsd`.
   - **Decidido (21/10/2026):** opción B. `POST /api/v1/cotizaciones` ya está publicado (ver [Cotizaciones](#cotizaciones--apiv1cotizaciones)).
   - **Favoritos (22/10/2026):** el backend publicó `/api/v1/favoritos` (ver [Favoritos](#favoritos--apiv1favoritos)). El frontend ya está listo para sincronizarlos con la cuenta, y desde el 22/10/2026 funciona en producción (pendiente 27 cerrado).
2. **Filtro por categoría:** `GET /api/v1/productos` no acepta categoría. Pedir `?categoria={slug}` o `?categoriaId={id}`.
3. ~~**`categoriaId` llega `null`**~~ ✅ **Resuelto** (20/10/2026): los 15 productos del seed traen `categoriaId`, y coincide con el `id` de `GET /api/v1/categorias`. Las migas de pan de la ficha resuelven la categoría por `categoriaId`.
4. **Servir `/uploads` desde el backend:** las fotos del seed van en `/uploads/productos/`, pero el backend todavía tiene que servir esa carpeta como contenido estático. Cuando exista, **agregar `/uploads` al proxy de Vite** (junto a `/auth` y `/api`).

### Necesarios para el login
5. ⏳ **`GET /auth/v1/me`** (ya publicado, pero da `500`: ver el 30) que devuelva los datos del usuario (`id`, `username`, `email`, `rol`). Sin esto, el frontend solo puede leer lo que venga dentro del JWT. **Confirmado el 21/10/2026:** no existe (`/auth/v1/me` y `/api/v1/usuarios/me` dan `404`), y el JWT **solo trae `sub` (username), `iss` y `exp`** — ni email ni rol. Es necesario para mostrar datos del usuario y para saber si es admin.
6. ~~**Login:** ¿se entra con `username` o con `email`?~~ ✅ **Resuelto (21/10/2026):** se entra con **cualquiera de los dos** (y da igual en qué campo vaya). El frontend manda solo `{ username, password }` y el `email` **no es obligatorio**. Ver [Comportamiento real de auth](#comportamiento-real-de-auth-probado-el-21102026).
7. **Google:** el frontend ya está listo (Google Identity Services → `POST /auth/v1/google` → se guarda el JWT del backend), pero el botón queda oculto hasta tener el Client ID. Falta:
   - [ ] **Client ID** de Google Cloud Console (ID de cliente OAuth 2.0, tipo "Aplicación web"). Debe ser **el mismo** con el que el backend valida el ID token en `/auth/v1/google`. Ponerlo en `VITE_GOOGLE_CLIENT_ID` del `.env` local.
   - [ ] **Orígenes de JavaScript autorizados** en ese Client ID: `http://localhost:5173` **y** `http://localhost` (Google pide los dos para desarrollo local), más el dominio de Vercel (`https://<proyecto>.vercel.app` y el dominio propio si se agrega). Las URL de *preview* de Vercel cambian en cada despliegue y no funcionarán salvo que se agreguen. No hacen falta URI de redirección: el botón usa ventana emergente.
   - [ ] **Variable `VITE_GOOGLE_CLIENT_ID` en Vercel** (Settings › Environment Variables) y volver a desplegar: Vite la lee al compilar, no en tiempo de ejecución.
   - [ ] Probar una vez contra Render que `/auth/v1/google` responde `200 { token }` con un ID token real (aún no se ha probado).
8. **Roles:** ¿hay usuarios ADMIN? `POST`/`PUT /api/v1/productos` deberían requerir token de admin (para categorías, ver el punto 15).

### Para manejar errores bien
9. Documentar respuestas de error: códigos (`400`, `401`, `403`, `404`, `409` usuario ya existe) y su forma, idealmente `{ "message": "..." }`. **Probado el 21/10/2026:** login fallido da `403` sin `message`; registro duplicado da `401 text/plain`; registro sin `email` da `500`. Falta normalizarlos (ver 14-bis) y devolver `{ "message": "..." }` en JSON para poder mostrar mensajes claros.
10. ~~Qué endpoints son públicos y cuáles requieren token.~~ ✅ **Probado el 21/10/2026** (ver [tabla](#qué-endpoints-exigen-token)): `GET` de productos y categorías son **públicos**; `POST`/`PUT` de productos y `POST` de categorías dan `403` (requieren admin); `POST`/`DELETE` de citas **exigen token**.
10-bis. **Registro duplicado debería ser `409` con JSON**, no `401 text/plain` (un `401` confunde al interceptor de axios, que lo interpretaría como "sesión vencida"). Y **registro sin `email` debería ser `400`**, no `500`.
10-ter. **Validar en el backend el formato de `email` y la fuerza de la `password`** en el registro (hoy acepta `"noesemail"` y contraseñas de 1 carácter). El frontend ya exige formato de correo y **mínimo 8 caracteres** (21/10/2026); el backend debería aplicar la misma regla, porque la validación del navegador se puede saltar.
10-quater. **¿Agendar cita es público o requiere login?** Hoy `POST /api/v1/citas` exige token (`403` sin él). Si la idea es un formulario público (ver `CLAUDE.md`), pedir que sea público; si no, el frontend obligará a iniciar sesión antes de agendar. **Decidir con el compañero.** **Pendiente de hablar con el backend (21/10/2026):** mientras siga exigiendo token, las pantallas de login y registro dicen solo "No necesitas cuenta para cotizar ni para escribirnos por WhatsApp". Si las citas se vuelven públicas, hay que actualizar ese texto para incluir las visitas (ver "Login y registro" en `DESIGN.md`).
11. ~~**Lista completa de valores de `tipoAsesoria`.**~~ ✅ **Resuelto (21/10/2026):** `VISITA_SHOWROOM`, `COTIZACION_GENERAL`, `PROYECTO_CORPORATIVO`, `DISENO_DE_ESPACIOS`, `RETIRO_DE_COMPRA`; un valor inválido ahora da `400`. Sigue sin aparecer en el Swagger (sería bueno exponerlo con `@Schema(allowableValues=...)`, pero ya no bloquea).
11-bis. ~~**Zona horaria de `fechaHora`.**~~ ✅ **Resuelto (21/10/2026):** `LocalDateTime`, columna `DATETIME`, hora de Caracas sin `Z` (`"2026-11-20T14:30:00"`). El backend corre en `America/Caracas`, así que la validación de "fecha en el pasado" usa la hora local. Ver [Zonas horarias](#zonas-horarias-en-fechahora).
11-ter. **Validar horario de atención y citas solapadas en el backend.** ✅ Horario confirmado (21/10/2026): lunes a viernes 8:30–17:00, sábados 8:30–13:30. **Siguen abiertos:** que el backend rechace citas fuera de ese horario y citas solapadas (el 21/10/2026 aceptaba domingos, 22:00 y dos citas en la misma franja), y **cuánto dura una cita**. Mientras tanto, el frontend usa `duracionCitaMinutos: 60` en `src/config/empresa.js` (el último turno ofrecido es una hora antes del cierre).
12. ~~Forma exacta de la respuesta de `POST /api/v1/citas` y confirmar que devuelve el `codigoCita`.~~ ✅ **Resuelto (21/10/2026):** `201 { "codigoCita": "CITA-XXXXXX", "mensaje": "Cita agendada con éxito" }`. El Swagger dice `200`, pero responde `201`.
12-bis. **Errores de citas:** `400` sin `message` (no se sabe qué campo falló) y `500` con un código inexistente en `PUT`/`DELETE` (debería ser `404`). Ver pendiente 9.
13. **`tipoEspacio`: confirmar si es valor único o lista.** Si es lista, cambia la forma del producto (`"tipoEspacio": ["OFICINA", "HOGAR"]`) y cómo funciona el filtro `?tipoEspacio=`.

### Categorías y citas
14. **Categoría repetida:** ¿qué pasa con `POST /api/v1/categorias` si ya existe ese nombre (o ese slug)? Lo ideal es un `409` con mensaje, y no un `500` o un duplicado.
15. **`POST /api/v1/categorias` debe requerir token de admin.**
16. **`GET /api/v1/citas/{codigoCita}`:** agregarlo, para que el cliente pueda consultar su cita antes de modificarla o cancelarla.
17. **Seguridad de `PUT` y `DELETE /api/v1/citas/{codigoCita}`:** **probado el 21/10/2026**: ambos **exigen token** (`403` sin él) y el código es aleatorio (`CITA-` + 6 hex), no secuencial. **Falta confirmar** que el backend comprueba que la cita **pertenece al usuario del token**. Si no lo hace, cualquier usuario registrado con un `codigoCita` ajeno podría modificarla o borrarla. Preguntar al compañero. También convendría un `GET /api/v1/citas/mias` para que el usuario vea sus citas sin tener que guardar el código.

### Detectados al probar la ficha de producto (20/10/2026)
19. **Imágenes rotas en el seed:** 3 URLs de Unsplash responden `404`: producto **2** (`photo-1497215848147-...`), **10** (`photo-1633534125867-...`) y **12** (`photo-1595514535310-...`). El frontend muestra el placeholder en su lugar, pero hay que cambiarlas. Además, los productos 8 y 9 usan la misma foto. Lo definitivo son las fotos reales de Instagram guardadas en `/uploads/productos/` (pendiente 4).
20. **Un `id` inexistente devuelve `500` en vez de `404`.** `ProductoService.obtenerPorId` lanza una `RuntimeException` genérica; debería lanzar una excepción que termine en `404` (p. ej. `ResponseStatusException(HttpStatus.NOT_FOUND, ...)` o un `@ControllerAdvice`), con cuerpo `{ "message": "Producto no encontrado" }` (pendiente 9). **Seguridad:** la respuesta de error incluye el stack trace (`trace`); desactivarlo con `server.error.include-stacktrace=never`.
21. **Un `id` no numérico devuelve `401` "Credenciales invalidas"** en un endpoint público. Parece que el manejo de errores de Spring Security convierte cualquier excepción en `401`; debería ser `400`. Es grave para el frontend: un `401` significa "sesión vencida", y el interceptor de axios cerrará la sesión y llevará al login (ver `CLAUDE.md`).
21-bis. **Un token inválido/vencido en un `GET` público devuelve `500`, no `401`** (probado 21/10/2026: `Authorization: Bearer abc.def.ghi` en `GET /api/v1/productos` → `500`). El interceptor de axios espera `401` para cerrar sesión; con `500` no lo hará. Pedir que un token mal formado o vencido devuelva `401`. Mientras tanto, el frontend **no debe mandar `Authorization` en peticiones públicas si no hay sesión**.

### Detectados al probar favoritos (22/10/2026)
27. ~~**Favoritos no funciona con un token válido:** `GET /api/v1/favoritos` → `401` y `POST`/`DELETE /api/v1/favoritos/{productoId}` → `500`.~~ ✅ **Resuelto (22/10/2026), comprobado con curl** (ver [prueba](#comportamiento-real-de-favoritos-probado-el-22102026)):
    - Con un token válido, `GET` → `200` con un arreglo de ids, y `POST`/`DELETE` → `204`.
    - Producto inexistente → `404`.
    - `POST` y `DELETE` son idempotentes: repetirlos responde `204`.
    - Con un token válido, favoritos ya no responde `401`. Los `401` que quedan (un id no numérico) y el `500` con un token mal formado son los pendientes generales 21 y 21-bis, no de favoritos.

### Detectados al probar "Compra por ambiente" del inicio (22/10/2026)
28. **`enShowroom` y `tipoEspacio` no se combinan.** Probado con curl contra Render: `?tipoEspacio=HOGAR` → 20 productos (todos `HOGAR`), pero `?enShowroom=true&tipoEspacio=HOGAR` (en cualquier orden) → los 41 del showroom, de todos los ambientes. Con `enShowroom` presente, `tipoEspacio` se ignora (probablemente un `if / else if` en el controlador). Pedir que los filtros se apliquen juntos. Mientras tanto el frontend **no envía filtros**: `obtenerProductos` pide el catálogo completo y filtra en el navegador con `filtrarProductos`, la misma función de `/buscar`.

### Para el panel de administración (23/10/2026)
30. **`GET /auth/v1/me` da `500` con un token válido** (probado con curl el 23/10/2026; sin token, `403`; **sigue igual el 26/10/2026**, también con la cuenta ADMIN). Ya no bloquea el panel: desde el 26/10/2026 el JWT trae `"rol"` y el frontend lo lee de ahí. Sigue haciendo falta para el perfil (nombre y correo). Es lo único que le dice al frontend si alguien es admin, así que **el panel no se puede abrir en producción** hasta que responda `200 { nombre, email, role }`. Probablemente el controlador no recibe el usuario autenticado (p. ej. `@AuthenticationPrincipal` nulo porque `/auth/**` está en `permitAll` y el filtro JWT no lo procesa). Alternativa: incluir `role` en el JWT. También hace falta **una cuenta ADMIN** para probar (¿cómo se crea? ¿seed?).
31. **Errores `400` de productos (`POST`/`PUT`):** no sabemos qué devuelven. Propuesta: `{ "message": "Datos inválidos", "errores": { "nombre": "Ya existe otro producto con ese nombre." } }`, con los nombres de campo de `ProductoRequest`. El frontend también entiende un mapa plano (`{ "nombre": "…" }`) y la forma de Spring (`{ "errors": [{ "field", "defaultMessage" }] }`); sin campos, muestra un aviso general. Confirmar además los largos máximos (el panel usa: nombre 120, descripción 1000, material 255, dimensiones 60) y si un nombre repetido se rechaza.
32. **Categorías (`PUT`/`DELETE`), preguntas abiertas:**
    - **¿Qué pasa al eliminar una categoría que tiene productos?** No está documentado. Propuesta: `409 { "message": "La categoría tiene 3 productos. Muévelos o elimínalos antes." }`. Hay que descartar que los borre en cascada o los deje con `categoriaId: null` sin avisar. Hoy el panel no deja intentarlo si sabe que tiene productos.
    - **¿`PUT` regenera el `slug` al cambiar el nombre?** Si sí, los enlaces viejos (`/categoria/silleria`) dejan de funcionar; el formulario lo avisa con un "podría". Si no, el slug queda desalineado del nombre (también vale, pero hay que saberlo).
    - **Largos máximos** de `nombre` y `descripcion`. El panel usa 60 y 255 (el largo por defecto de una columna de texto en JPA).
    - Un `id` inexistente en `PUT`/`DELETE` debería dar `404` (como el pendiente 20 de productos).
29. ~~**Citas para administración.**~~ ✅ **Publicado el 26/10/2026** (ver [Administración de cotizaciones y citas](#administración-de-cotizaciones-y-citas-probado-el-26102026)). El estado final es `COMPLETADA`. Lo que falta del `GET` (nombre y correo del cliente, sin el `User`) sigue en el pendiente 33.
33. ~~**🚨 `GET /api/v1/citas` expone el hash de la contraseña.**~~ ✅ **Corregido el 26/10/2026** (vuelto a probar con curl): `/api/v1/citas` y `/mis-citas` devuelven `CitaResponse`, sin `usuario` ni `password`, y con `nombreCliente` y `email`. Lo que decía el pendiente: Cada cita trae `usuario` como la entidad `User` completa: `password` (bcrypt), `role`, `authorities`… Un hash filtrado se puede atacar sin conexión, y las contraseñas cortas caen rápido. Probablemente pase lo mismo en `GET /api/v1/citas/mis-citas`. **Pedir:** que los dos devuelvan un DTO `{ codigoCita, nombreCliente, email, empresa, telefono, fechaHora, tipoAsesoria, estado, notas, creadoEn }` sin `usuario` (o, como mínimo, `@JsonIgnore` en `User.password`). Relacionado: la cita **no guarda** el `nombreCliente` ni el `email` que manda `CitaRequest`; hoy el panel muestra los de la cuenta.
34. **Zona horaria de `fechaCreacion` (cotizaciones) y `creadoEn` (citas):** vienen sin zona (`"2026-10-21T23:31:49.453401"`). `fechaHora` de las citas es hora de Caracas (pendiente 11-bis), pero estas dos las pone el servidor, y Render suele correr en UTC. Confirmar en qué zona se guardan. Mientras tanto el panel las muestra tal cual (`formatearRegistro` en `src/utils/fecha.js`) y podrían verse 4 h adelantadas. **Pista (26/10/2026):** los códigos son secuenciales, pero `COT-0002` dice 21/10 23:36 y `COT-0003`, creada después, dice 21/10 19:59. Parece que el servidor pasó de UTC a hora de Caracas entre las dos: las cotizaciones viejas estarían en UTC y las nuevas en Caracas. Confirmarlo con el compañero.
35. **Errores del `PATCH` de administración (a medias tras el arreglo del 26/10/2026):** ✅ citas ya da `404` con un código inexistente. ❌ **Cotizaciones sigue dando `500`** (`COT-9999`). ❌ Un estado inválido sigue dando `400` con el mensaje genérico de citas ("Verifica que los valores (como el tipoAsesoria o la fecha)…"), también en cotizaciones. El panel trata `404` y `500` como "Puede que ya no exista: actualiza la lista."
36. **`creadoEn` llega en `null` en `CitaResponse`** (nuevo tras el arreglo del pendiente 33, 26/10/2026). Antes, la entidad traía la fecha (`"2026-10-21T15:04:32.162127"`), así que el dato existe y probablemente falta copiarlo al armar el DTO. El panel no muestra "Agendada el …" mientras venga `null`.

### Para cuando crezca el catálogo
22. **Paginación, orden y precio en el servidor:** hoy no existen y el frontend lo resuelve localmente (ver la decisión en `GET /api/v1/productos`). Si el catálogo crece, pedir paginación y parámetros como `?orden=` y `?precioMin=&precioMax=`, además de `?categoria=` (pendiente 2).

### Detectados al probar `buscar` (20/10/2026)
23. **`buscar` solo mira el `nombre`.** Pedir que busque también en `descripcion`, `material` y el nombre de la categoría, y que cada palabra se busque por separado (hoy `silla malla` no encuentra la "Silla Ejecutiva Malla Transpirable").
24. **Recortar el texto (`trim`) en el backend:** hoy `" silla "` devuelve `[]`. El frontend lo recortará igualmente.
25. **Escapar `%` y `_`:** hoy funcionan como comodines de `LIKE` (`buscar=%` devuelve todo). No es grave con un catálogo público, pero el resultado es inesperado.
26. **`?buscar=` no se usa hoy** (el frontend busca localmente; ver la decisión en `GET /api/v1/productos`). Si el catálogo crece y la búsqueda tiene que volver al servidor, `buscar` necesitaría antes los puntos 23, 24 y 25 (buscar en `nombre`, `descripcion`, `material` y categoría, palabra por palabra, con trim) para no perder resultados que hoy sí aparecen. Además, para los conteos de cada filtro ("Hogar (3)"), la API tendría que devolverlos junto con los resultados.

### CORS
18. ~~Confirmar CORS para el dominio de producción.~~ ✅ **No hace falta:** axios usa rutas relativas; en desarrollo las reenvía el proxy de Vite y en producción los rewrites de `vercel.json`, así que el navegador nunca habla con otro origen (ver `CLAUDE.md`). Si el pendiente 4 se resuelve, `/uploads` tendrá que agregarse **en los dos sitios**: el proxy de Vite y `vercel.json`.
