# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

La empresa vende a todo público interesado; no hay un segmento principal. Los clientes típicos son:

- **Empresas y oficinas** que equipan varias estaciones a la vez y piden cotización. Necesitan confianza profesional: ver bien el producto, sus materiales y medidas, y saber que hay una empresa seria detrás.
- **Negocios como salones de belleza, barberías, spas o consultorios** que compran peinadores, camillas o sillería. Necesitan ubicar rápido la pieza adecuada para su local y saber si pueden verla en el showroom.
- **Personas y emprendedores** que llegan desde Instagram buscando una pieza para su casa u oficina pequeña. Necesitan encontrar rápido lo que vieron y cerrar sin fricción.

La web debe sentirse profesional y confiable para quien compra en volumen, pero cercana y simple para cualquiera. Ningún segmento debe sentirse excluido por el tono o las imágenes.

## Product Purpose

Tienda online propia de una empresa venezolana de mobiliario (sillas, escritorios, mesas, comedores, peinadores, camillas) para oficinas, negocios y hogares. Hoy venden solo por Instagram (@mobiliariodeoficina) y cierran ventas por mensaje directo; el sitio les da un catálogo ordenado, buscable y filtrable, y un camino claro de la exploración a la venta.

Éxito: que un cliente pueda armar su lista de productos y enviar una **solicitud de cotización**, escribir por WhatsApp con esa lista o **agendar una visita al showroom**, sin depender de un intercambio de mensajes en Instagram.

## Positioning

Según la empresa, lo que la distingue es: **showroom físico** (se pueden ver y probar los muebles en persona), **buenos precios** y **buena atención**. El showroom es el único diferenciador verificable en los datos (`enShowroom` por producto y el flujo de citas); "buenos precios" y "buena atención" son afirmaciones del negocio, no datos comparativos.

## Operating Context

- El catálogo lo publica la empresa en su Instagram; las fotos se descargan y se sirven localmente (nunca enlazar el CDN de Instagram).
- El precio es **referencial** (`precioReferencialUsd`): el precio final lo da la empresa al responder la cotización. Mostrarlo como "Precio referencial" / "Desde $X", nunca como precio de compra cerrado.
- Flujo de compra:
  1. El cliente arma su lista en el carrito (Pinia + localStorage).
  2. **Flujo principal:** envía la lista como solicitud de cotización con sus datos (nombre, teléfono, email y, si aplica, empresa o negocio).
  3. **Alternativa rápida:** botón "Enviar por WhatsApp" que abre un mensaje con la lista de productos (así cierran hoy los clientes de Instagram).
  4. **Opcional:** agendar una visita o asesoría en el showroom (`POST /api/v1/citas`).
- Proyecto académico en equipo: frontend (Vue) y backend (Spring Boot) separados; el contrato vive en `API.md`.

## Capabilities and Constraints

- Catálogo de productos con categorías (`GET /api/v1/categorias`, por `slug`), detalle por `id`, búsqueda por texto, filtro **en showroom** y filtro por **tipo de espacio** (`OPERATIVO`, `GERENCIAL`, …).
- Cada producto trae nombre, descripción, categoría, tipo de espacio, precio referencial en USD, material, dimensiones estándar e imágenes.
- Cuentas de usuario con JWT: registro, login y login con Google.
- Agendar cita/asesoría.
- Carrito y favoritos viven en el frontend (Pinia + localStorage); no hay endpoints de carrito, favoritos ni pedidos.
- Nombres de campos de la API en español; se usan tal cual.
- **Decisiones abiertas** (ver pendientes en `API.md`): endpoint para recibir la solicitud de cotización (p. ej. `POST /api/v1/cotizaciones`) o si se canaliza por cita; número de WhatsApp de destino; lista completa de `tipoEspacio` y `tipoAsesoria`; filtro de productos por categoría; dirección y horario del showroom; si existe rol ADMIN.

## Brand Commitments

- Nombre comercial en uso: "Mobiliario de Oficina"; Instagram @mobiliariodeoficina.
- Textos de la interfaz en español (Venezuela).
- Referencia de experiencia de compra: IKEA.com y Amazon.com, solo en estructura (navegación, catálogo, ficha de producto, carrito), no en estética.
- No hay logo ni identidad visual registrados en el repositorio todavía.

## Evidence on Hand

- Productos y fotos reales: los de su Instagram (aún no descargados al repo; `src/assets/` está vacío).
- Datos de ejemplo del backend en `API.md` (escritorio bench, sillería ergonómica).
- **No hay** testimonios, clientes, cifras de ventas, reseñas ni premios. No inventarlos.

## Product Principles

1. **Cotizar, no cobrar.** El precio es referencial y la venta se cierra con una persona; cada pantalla debe acercar al cliente a pedir cotización, escribir por WhatsApp o visitar el showroom.
2. **Confianza profesional sin complicar.** Información completa (materiales, medidas, fotos reales) para quien compra en volumen, en una navegación que cualquier persona que viene de Instagram entiende al instante.
3. **El showroom es la prueba.** Lo que se puede ver en persona se señala y se conecta con agendar una visita.
4. **Una pieza o una oficina completa.** Armar listas con varios productos y cantidades debe ser fácil, y comprar una sola pieza también.
5. **Fiel al catálogo real.** Productos, fotos y datos salen de la empresa y de la API; nada inventado ni enlazado a fuentes que caducan.
6. **Nadie queda fuera.** Textos, ejemplos e imágenes alternan oficinas, negocios (salones, barberías, spas, consultorios) y espacios en casa; ninguno se presenta como el cliente "de verdad".
