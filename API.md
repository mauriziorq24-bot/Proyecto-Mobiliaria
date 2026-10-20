# API.md — Contrato del backend

Fuente: Swagger del backend (Spring Boot), revisado el 17/10/2026. Actualizado el 19/10/2026 (`tipoEspacio` y categorías) y el 20/10/2026 (nuevos endpoints de productos, categorías y citas; seed del backend).
Swagger UI: `http://localhost:8080/swagger-ui/index.html` · Spec JSON: `http://localhost:8080/v3/api-docs`

> Si este archivo y el Swagger no coinciden, **manda el Swagger**. Actualizar este archivo cuando cambie el backend.

## Datos generales

- **URL base:** `http://localhost:8080` (sin `/api`, porque hay dos prefijos: `/auth/v1` y `/api/v1`).
- **Autenticación:** JWT. Login, registro y Google devuelven `{ "token": "..." }`. Se envía como `Authorization: Bearer <token>`.
- **Formato:** JSON. Nombres de campos en **español y camelCase** (`nombre`, `precioReferencialUsd`).
- **Paginación:** no hay. `GET /api/v1/productos` devuelve el arreglo completo.

### Datos iniciales (seed del backend)

El backend tendrá un seed que carga:
- **Categorías (5):** `escritorios`, `silleria`, `comedores`, `peinadores`, `camillas` (ver [Categorías](#categorías--apiv1categorias)).
- **`tipoEspacio`:** `OFICINA`, `HOGAR`, `SALON_BELLEZA`, `CONSULTORIO` (ver [valores](#valores-de-tipoespacio)).
- **Imágenes de productos** en `/uploads/productos/` (ver pendientes: el backend todavía tiene que servir esa carpeta).

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

### `GET /api/v1/productos/{id}`
Response 200: un `ProductoResponse`.

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
3. **`categoriaId` llega `null`** en los productos de ejemplo: la relación producto↔categoría no se está guardando o no se mapea en el DTO.
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

### CORS
18. En desarrollo no hace falta: el frontend usa el proxy de Vite (ver `CLAUDE.md`). Solo falta confirmar CORS para el dominio de **producción** (`VITE_API_URL`).
