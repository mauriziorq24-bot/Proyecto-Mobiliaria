# API.md — Contrato del backend

Fuente: Swagger del backend (Spring Boot), revisado el 17/10/2026. Actualizado el 19/10/2026 (`tipoEspacio` y categorías) y el 20/10/2026 (nuevos endpoints de productos, categorías y citas; seed del backend; respuestas reales de la ficha de producto, probadas contra el backend vía ngrok). Desde el 20/10/2026 el backend está en producción en Render.
Swagger UI: `https://backendmobiliariodeoficina.onrender.com/swagger-ui/index.html` · Spec JSON: `https://backendmobiliariodeoficina.onrender.com/v3/api-docs` (en local: `http://localhost:8080/...`)

> Si este archivo y el Swagger no coinciden, **manda el Swagger**. Actualizar este archivo cuando cambie el backend.

## Datos generales

- **URL base:** `https://backendmobiliariodeoficina.onrender.com` en producción (Render), `http://localhost:8080` en local. Sin `/api`, porque hay dos prefijos: `/auth/v1` y `/api/v1`.
- **Cold start:** Render gratuito duerme el servidor tras un rato sin uso; la primera petición puede tardar hasta ~1 minuto. El frontend espera hasta 60 s (timeout de axios).
- **Autenticación:** JWT. Login, registro y Google devuelven `{ "token": "..." }`. Se envía como `Authorization: Bearer <token>`.
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
// Response 200
{ "token": "string" }
```

### `POST /auth/v1/login`
```json
// Request (⚠️ pide también email — ver pendientes)
{ "username": "string", "password": "string", "email": "string" }
// Response 200
{ "token": "string" }
```

### `POST /auth/v1/google`
```json
// Request: el ID token que entrega Google Identity Services en el frontend
{ "token": "string" }
// Response 200: JWT propio del backend
{ "token": "string" }
```

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

> **Decisión del frontend (20/10/2026) para la página de búsqueda:** `productoService` pide `GET /api/v1/productos?buscar=` una sola vez por cada texto buscado y filtra localmente por categoría, `tipoEspacio`, `enShowroom` y precio, y también ordena. Motivo: el catálogo es pequeño y no tiene paginación, así que filtrar en el navegador es más rápido y evita esperar otra vez el cold start de Render con cada cambio de filtro. Si el catálogo crece y el backend agrega paginación, el servicio pasará a enviar `tipoEspacio`, `enShowroom` y `categoria` a la API (y el orden y el precio, si se agregan), sin cambiar las vistas. Ver pendientes 2 y 22.

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
// Response 200: objeto clave-valor (forma exacta por confirmar)
{ "mensaje": "string" }
```
`fechaHora` en formato ISO 8601 (`new Date().toISOString()`).

### `PUT /api/v1/citas/{codigoCita}`
Modifica una cita. Body: `CitaRequest` (el mismo de `POST`).

### `DELETE /api/v1/citas/{codigoCita}`
Cancela (elimina) una cita.

> Para usar `PUT` y `DELETE` el cliente necesita su `codigoCita` (ver pendientes: confirmar que `POST` lo devuelve y definir la seguridad).

---

## ⚠️ Pendientes con el backend

### Bloquean funcionalidades del plan
1. **Carrito, favoritos y pedidos:** no existen endpoints. Mientras se decide, el frontend guarda carrito y favoritos en Pinia + localStorage (ver `CLAUDE.md`). Decidir:
   - **Opción A:** el backend los crea (`/api/v1/carrito`, `/api/v1/favoritos`, `/api/v1/pedidos`).
   - **Opción B:** carrito y favoritos viven en el frontend (Pinia + localStorage) y el "checkout" se convierte en **solicitud de cotización** (vía cita, WhatsApp o un endpoint `POST /api/v1/cotizaciones`). Encaja con `precioReferencialUsd`.
2. **Filtro por categoría:** `GET /api/v1/productos` no acepta categoría. Pedir `?categoria={slug}` o `?categoriaId={id}`.
3. ~~**`categoriaId` llega `null`**~~ ✅ **Resuelto** (20/10/2026): los 15 productos del seed traen `categoriaId`, y coincide con el `id` de `GET /api/v1/categorias`. Las migas de pan de la ficha resuelven la categoría por `categoriaId`.
4. **Servir `/uploads` desde el backend:** las fotos del seed van en `/uploads/productos/`, pero el backend todavía tiene que servir esa carpeta como contenido estático. Cuando exista, **agregar `/uploads` al proxy de Vite** (junto a `/auth` y `/api`).

### Necesarios para el login
5. **`GET /auth/v1/me`** que devuelva los datos del usuario (`id`, `username`, `email`, `rol`). Sin esto, el frontend solo puede leer lo que venga dentro del JWT.
6. **Login:** ¿se entra con `username` o con `email`? Lo normal es uno de los dos más `password`, no ambos.
7. **Google:** el frontend necesita el **Google Client ID** (el mismo que valida el backend).
8. **Roles:** ¿hay usuarios ADMIN? `POST`/`PUT /api/v1/productos` deberían requerir token de admin (para categorías, ver el punto 15).

### Para manejar errores bien
9. Documentar respuestas de error: códigos (`400`, `401`, `403`, `404`, `409` usuario ya existe) y su forma, idealmente `{ "message": "..." }`.
10. Qué endpoints son públicos y cuáles requieren token.
11. Lista completa de valores de `tipoAsesoria`.
12. Forma exacta de la respuesta de `POST /api/v1/citas`, y **confirmar que devuelve el `codigoCita`** (sin él, el cliente no puede modificar ni cancelar su cita).
13. **`tipoEspacio`: confirmar si es valor único o lista.** Si es lista, cambia la forma del producto (`"tipoEspacio": ["OFICINA", "HOGAR"]`) y cómo funciona el filtro `?tipoEspacio=`.

### Categorías y citas
14. **Categoría repetida:** ¿qué pasa con `POST /api/v1/categorias` si ya existe ese nombre (o ese slug)? Lo ideal es un `409` con mensaje, y no un `500` o un duplicado.
15. **`POST /api/v1/categorias` debe requerir token de admin.**
16. **`GET /api/v1/citas/{codigoCita}`:** agregarlo, para que el cliente pueda consultar su cita antes de modificarla o cancelarla.
17. **Seguridad de `PUT` y `DELETE /api/v1/citas/{codigoCita}`:** definir quién puede usarlos (¿basta con conocer el `codigoCita`?, ¿se pide también el email?, ¿requiere token?). Si el código es adivinable (p. ej. secuencial), cualquiera podría cambiar o borrar citas ajenas.

### Detectados al probar la ficha de producto (20/10/2026)
19. **Imágenes rotas en el seed:** 3 URLs de Unsplash responden `404`: producto **2** (`photo-1497215848147-...`), **10** (`photo-1633534125867-...`) y **12** (`photo-1595514535310-...`). El frontend muestra el placeholder en su lugar, pero hay que cambiarlas. Además, los productos 8 y 9 usan la misma foto. Lo definitivo son las fotos reales de Instagram guardadas en `/uploads/productos/` (pendiente 4).
20. **Un `id` inexistente devuelve `500` en vez de `404`.** `ProductoService.obtenerPorId` lanza una `RuntimeException` genérica; debería lanzar una excepción que termine en `404` (p. ej. `ResponseStatusException(HttpStatus.NOT_FOUND, ...)` o un `@ControllerAdvice`), con cuerpo `{ "message": "Producto no encontrado" }` (pendiente 9). **Seguridad:** la respuesta de error incluye el stack trace (`trace`); desactivarlo con `server.error.include-stacktrace=never`.
21. **Un `id` no numérico devuelve `401` "Credenciales invalidas"** en un endpoint público. Parece que el manejo de errores de Spring Security convierte cualquier excepción en `401`; debería ser `400`. Es grave para el frontend: un `401` significa "sesión vencida", y el interceptor de axios cerrará la sesión y llevará al login (ver `CLAUDE.md`).

### Para cuando crezca el catálogo
22. **Paginación, orden y precio en el servidor:** hoy no existen y el frontend lo resuelve localmente (ver la decisión en `GET /api/v1/productos`). Si el catálogo crece, pedir paginación y parámetros como `?orden=` y `?precioMin=&precioMax=`, además de `?categoria=` (pendiente 2).

### Detectados al probar `buscar` (20/10/2026)
23. **`buscar` solo mira el `nombre`.** Pedir que busque también en `descripcion`, `material` y el nombre de la categoría, y que cada palabra se busque por separado (hoy `silla malla` no encuentra la "Silla Ejecutiva Malla Transpirable").
24. **Recortar el texto (`trim`) en el backend:** hoy `" silla "` devuelve `[]`. El frontend lo recortará igualmente.
25. **Escapar `%` y `_`:** hoy funcionan como comodines de `LIKE` (`buscar=%` devuelve todo). No es grave con un catálogo público, pero el resultado es inesperado.

### CORS
18. En desarrollo no hace falta: el frontend usa el proxy de Vite (ver `CLAUDE.md`). Solo falta confirmar CORS para el dominio de **producción** (`VITE_API_URL`).
