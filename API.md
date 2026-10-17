# API.md — Contrato del backend

Fuente: Swagger del backend (Spring Boot), revisado el 17/10/2026.
Swagger UI: `http://localhost:8080/swagger-ui/index.html` · Spec JSON: `http://localhost:8080/v3/api-docs`

> Si este archivo y el Swagger no coinciden, **manda el Swagger**. Actualizar este archivo cuando cambie el backend.

## Datos generales

- **URL base:** `http://localhost:8080` (sin `/api`, porque hay dos prefijos: `/auth/v1` y `/api/v1`).
- **Autenticación:** JWT. Login, registro y Google devuelven `{ "token": "..." }`. Se envía como `Authorization: Bearer <token>`.
- **Formato:** JSON. Nombres de campos en **español y camelCase** (`nombre`, `precioReferencialUsd`).
- **Paginación:** no hay. `GET /api/v1/productos` devuelve el arreglo completo.

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
| `tipoEspacio` | string | Filtra por tipo de espacio (`OPERATIVO`, `GERENCIAL`, …) |
| `buscar` | string | Búsqueda por texto |

Response 200: arreglo de `ProductoResponse`.

### `GET /api/v1/productos/{id}`
Response 200: un `ProductoResponse`.

### `POST /api/v1/productos`
Crea un producto (uso administrativo). Body: `ProductoRequest` (igual a `ProductoResponse` sin `id` ni `categoriaNombre`).

### `ProductoResponse`
```json
{
  "id": 1,
  "nombre": "Escritorio Modular tipo Bench para 4 personas",
  "descripcion": "Estación de trabajo optimizada con pasacables integrados y pantallas divisorias.",
  "categoriaId": 3,
  "categoriaNombre": "Estaciones Operativas",
  "tipoEspacio": "OPERATIVO",
  "precioReferencialUsd": 450,
  "enShowroom": true,
  "material": "Melamina 18mm con estructura metálica electrostática.",
  "dimensionesEstandar": "2.40m x 1.20m x 0.75m",
  "imagenes": ["https://.../escritorio-bench.jpg"]
}
```

Notas:
- `precioReferencialUsd` es **referencial**: mostrar como "Precio referencial" / "Desde $450", no como precio final.
- Sin campo `stock` ni `slug` en productos: las rutas del frontend usan el `id` (`/producto/:id`).

---

## Categorías — `/api/v1/categorias`

### `GET /api/v1/categorias`
```json
[
  { "id": 1, "nombre": "Sillería Ergonómica", "slug": "silleria-ergonomica", "descripcion": "string" }
]
```
Categorías vistas en los datos: "Estaciones Operativas", "Sillería Ergonómica" (lista completa: pedir al backend).

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

---

## ⚠️ Pendientes con el backend

### Bloquean funcionalidades del plan
1. **Carrito, favoritos y pedidos:** no existen endpoints. Decidir:
   - **Opción A:** el backend los crea (`/api/v1/carrito`, `/api/v1/favoritos`, `/api/v1/pedidos`).
   - **Opción B:** carrito y favoritos viven en el frontend (Pinia + localStorage) y el "checkout" se convierte en **solicitud de cotización** (vía cita, WhatsApp o un endpoint `POST /api/v1/cotizaciones`). Encaja con `precioReferencialUsd`.
2. **Filtro por categoría:** `GET /api/v1/productos` no acepta categoría. Pedir `?categoria={slug}` o `?categoriaId={id}`.
3. **`categoriaId` llega `null`** en los productos de ejemplo: la relación producto↔categoría no se está guardando o no se mapea en el DTO.
4. **Imágenes:** hoy son URLs de ejemplo. Definir dónde se guardan las fotos reales (carpeta estática del backend, p. ej. `/uploads/...`) y que la API devuelva URLs que funcionen.

### Necesarios para el login
5. **`GET /auth/v1/me`** que devuelva los datos del usuario (`id`, `username`, `email`, `rol`). Sin esto, el frontend solo puede leer lo que venga dentro del JWT.
6. **Login:** ¿se entra con `username` o con `email`? Lo normal es uno de los dos más `password`, no ambos.
7. **Google:** el frontend necesita el **Google Client ID** (el mismo que valida el backend).
8. **Roles:** ¿hay usuarios ADMIN? `POST /api/v1/productos` debería requerir token de admin.

### Para manejar errores bien
9. Documentar respuestas de error: códigos (`400`, `401`, `403`, `404`, `409` usuario ya existe) y su forma, idealmente `{ "message": "..." }`.
10. Qué endpoints son públicos y cuáles requieren token.
11. Lista completa de valores de `tipoEspacio` y de `tipoAsesoria`.
12. Forma exacta de la respuesta de `POST /api/v1/citas`.

### CORS
13. Confirmar que se permite el origen `http://localhost:5173` (o usar el proxy de Vite en desarrollo, ver `CLAUDE.md`).
