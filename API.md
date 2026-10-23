# API.md — Contrato del backend

Fuente: Swagger del backend (Spring Boot), revisado el 17/10/2026. Actualizado el 19/10/2026 (`tipoEspacio` y categorías) y el 20/10/2026 (nuevos endpoints de productos, categorías y citas; seed del backend; respuestas reales de la ficha de producto, probadas contra el backend vía ngrok). Desde el 20/10/2026 el backend está en producción en Render. Actualizado el 21/10/2026: **comportamiento real de autenticación probado con curl contra Render** (registro, duplicados, login, errores, contenido del JWT y qué endpoints exigen token). Ver [Comportamiento real de auth](#comportamiento-real-de-auth-probado-el-21102026). También el 21/10/2026: **citas probadas con curl** (respuesta de `POST`, `tipoAsesoria`, validaciones, zona horaria y seguridad de `PUT`/`DELETE`). Ver [Comportamiento real de citas](#comportamiento-real-de-citas-probado-el-21102026). Y el 21/10/2026, **respuestas del compañero** sobre citas: `fechaHora` en hora de Caracas, lista de `tipoAsesoria`, `400` para enum inválido y horario de atención (cierran los pendientes 11 y 11-bis). Actualizado el 22/10/2026: **favoritos** (`/api/v1/favoritos`), contrato del Swagger y prueba con curl; ver [Favoritos](#favoritos--apiv1favoritos). El mismo día el backend corrigió el pendiente 27 y se volvió a probar con curl.
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
- **`exp` dura ~1 hora** (probado: `exp - now ≈ 3595 s`). Tras una hora el token caduca y el backend empezará a rechazar; el frontend debe manejar esa expiración (ver más abajo el ⚠️ del `500`).

**Qué es un JWT y por qué el frontend puede leerlo pero no modificarlo.** Un JWT (JSON Web Token) son tres partes separadas por puntos: `header.payload.firma`. El header y el payload son **solo JSON codificado en base64url** — no están cifrados, por eso el navegador (o cualquiera) puede decodificarlos y leer `sub`/`exp`. La tercera parte es una **firma**: el backend la calcula con el algoritmo `HS384` usando una **clave secreta que solo él conoce**. En cada petición el backend recalcula la firma del `header.payload` que recibe y la compara con la que viene; si no coincide, rechaza el token. Por eso, aunque el frontend podría cambiar el payload (p. ej. poner `"rol":"ADMIN"`), **no puede generar la firma correcta sin la clave secreta**, y el backend lo detectaría. Conclusión práctica: el frontend trata el contenido del JWT como **informativo** (mostrar el nombre, saber cuándo caduca), pero **la autorización real siempre la decide el backend**; nunca confiar en el token para dar o quitar permisos en el cliente.

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

### ⏳ Propuesta pendiente: citas para administración (23/10/2026)

> **No existe todavía.** Es el contrato que le propusimos al backend (paso 10B) para la sección Citas del panel `/admin`. Ver pendiente 29. El frontend lo usa solo con `VITE_ADMIN_CITAS_API=true`; con `VITE_USE_MOCKS=true` responde un mock con la misma forma.

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/v1/citas` | Todas las citas (fecha, cliente, tipo, estado). Solo `ADMIN`. |
| `PATCH` | `/api/v1/citas/{codigoCita}` | Cambia el estado. Body: `{ "estado": "CONFIRMADA" }`. Solo `ADMIN`. |

- **Estados propuestos:** `PENDIENTE`, `CONFIRMADA`, `CANCELADA`, `ATENDIDA`.
- **Por confirmar con el backend:**
  - El Swagger (revisado el 23/10/2026) ya tiene la entidad `CitaShowroom` con `estado`: `PENDIENTE | CONFIRMADA | COMPLETADA | CANCELADA`. Dice **`COMPLETADA`** donde la propuesta dice **`ATENDIDA`**: hay que quedarse con un solo nombre.
  - `CitaShowroom` no tiene `nombreCliente` ni `email` (solo `usuario`, `empresa` y `telefono`), aunque `CitaRequest` sí los manda. El `GET` tiene que devolver `codigoCita`, `nombreCliente`, `empresa`, `telefono`, `email`, `fechaHora`, `tipoAsesoria`, `estado`, `notas` y `creadoEn`, sin exponer el `User` completo (hoy trae `password`).
  - Hoy solo existe `GET /api/v1/citas/mis-citas` (las citas de la persona con sesión).

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
> El backend también expone `GET /api/v1/cotizaciones` (lista con `detalles`, `totalUsd`, `estado`: `PENDIENTE` | `CONTACTADO` | `CANCELADA`) y `PATCH /api/v1/cotizaciones/{id}/estado`. Sin token responden `403`: son para administración y el frontend no los usa.

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
5. **`GET /auth/v1/me`** que devuelva los datos del usuario (`id`, `username`, `email`, `rol`). Sin esto, el frontend solo puede leer lo que venga dentro del JWT. **Confirmado el 21/10/2026:** no existe (`/auth/v1/me` y `/api/v1/usuarios/me` dan `404`), y el JWT **solo trae `sub` (username), `iss` y `exp`** — ni email ni rol. Es necesario para mostrar datos del usuario y para saber si es admin.
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
29. **Citas para administración:** pedir `GET /api/v1/citas` y `PATCH /api/v1/citas/{codigoCita}` con `{ "estado" }`, los dos solo para `ADMIN` (ver [la propuesta](#-propuesta-pendiente-citas-para-administración-23102026)). Confirmar si el estado final se llama `ATENDIDA` (propuesta) o `COMPLETADA` (entidad del Swagger), y que el `GET` devuelva nombre y correo del cliente. Mientras no exista, `VITE_ADMIN_CITAS_API=false` y la sección no aparece en el panel.

### Para cuando crezca el catálogo
22. **Paginación, orden y precio en el servidor:** hoy no existen y el frontend lo resuelve localmente (ver la decisión en `GET /api/v1/productos`). Si el catálogo crece, pedir paginación y parámetros como `?orden=` y `?precioMin=&precioMax=`, además de `?categoria=` (pendiente 2).

### Detectados al probar `buscar` (20/10/2026)
23. **`buscar` solo mira el `nombre`.** Pedir que busque también en `descripcion`, `material` y el nombre de la categoría, y que cada palabra se busque por separado (hoy `silla malla` no encuentra la "Silla Ejecutiva Malla Transpirable").
24. **Recortar el texto (`trim`) en el backend:** hoy `" silla "` devuelve `[]`. El frontend lo recortará igualmente.
25. **Escapar `%` y `_`:** hoy funcionan como comodines de `LIKE` (`buscar=%` devuelve todo). No es grave con un catálogo público, pero el resultado es inesperado.
26. **`?buscar=` no se usa hoy** (el frontend busca localmente; ver la decisión en `GET /api/v1/productos`). Si el catálogo crece y la búsqueda tiene que volver al servidor, `buscar` necesitaría antes los puntos 23, 24 y 25 (buscar en `nombre`, `descripcion`, `material` y categoría, palabra por palabra, con trim) para no perder resultados que hoy sí aparecen. Además, para los conteos de cada filtro ("Hogar (3)"), la API tendría que devolverlos junto con los resultados.

### CORS
18. ~~Confirmar CORS para el dominio de producción.~~ ✅ **No hace falta:** axios usa rutas relativas; en desarrollo las reenvía el proxy de Vite y en producción los rewrites de `vercel.json`, así que el navegador nunca habla con otro origen (ver `CLAUDE.md`). Si el pendiente 4 se resuelve, `/uploads` tendrá que agregarse **en los dos sitios**: el proxy de Vite y `vercel.json`.
