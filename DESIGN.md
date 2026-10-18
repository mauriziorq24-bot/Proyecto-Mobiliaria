---
name: Mobiliario de Oficina
description: Tienda online de mobiliario de oficina con cotización, WhatsApp y visitas al showroom.
colors:
  brand: "#1F80E0"
  brand-deep: "#1566B8"
  brand-deeper: "#12579F"
  brand-tint: "#E8F1FC"
  showroom-gold: "#E4A11B"
  ground: "#F3F5F8"
  surface: "#FFFFFF"
  line: "#DCE2EA"
  ink: "#14171C"
  ink-muted: "#5B6573"
  footer-mesh: "#14171C"
  whatsapp: "#0F7A43"
  success: "#1E7F4F"
  success-bg: "#E7F5EE"
  error: "#C62F2F"
  error-bg: "#FDECEC"
  warning: "#9A5B00"
  warning-bg: "#FFF4E0"
  swatch-gerencial: "#1F80E0"
  swatch-operativo: "#2B2F36"
  swatch-reserve-3: "#6E7783"
  swatch-reserve-4: "#8A6A4B"
  swatch-reserve-5: "#C9CFD7"
typography:
  display:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.2rem + 2vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.2
  headline:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.2rem + 1.2vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.22
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.28
  card-title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.12em"
  price:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
    fontFeature: "\"tnum\" 1"
  price-large:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.15
    fontFeature: "\"tnum\" 1"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
components:
  header:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
  category-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    height: "48px"
  search-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "46px"
    padding: "0 14px"
  button-primary:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "46px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.brand-deeper}"
  button-visit:
    backgroundColor: "{colors.showroom-gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "42px"
    padding: "0 16px"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "46px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.md}"
    height: "46px"
    padding: "0 20px"
  chip-category:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  chip-visit:
    backgroundColor: "{colors.showroom-gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  tag-showroom:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "3px 7px"
  chip-material:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "3px 7px"
  card-product:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  swatch:
    rounded: "{rounded.md}"
    width: "84px"
    height: "112px"
  swatch-selected:
    height: "132px"
  cart-dock:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "12px 16px 20px"
  footer:
    backgroundColor: "{colors.footer-mesh}"
    textColor: "{colors.surface}"
---

# Design System: Mobiliario de Oficina

> Dirección aprobada el 2026-10-18 («Muestrario de tapicería», con la barra de presupuesto móvil incorporada). Es un documento **previo a la implementación**: cuando exista el código, se vuelve a generar desde el código real (`/impeccable document`) para que no se separe de lo construido.

## Overview

**Creative North Star: "El muestrario del showroom"**

La tienda se usa como se elige en el showroom: tocando la muestra. La firma del sistema es una **tira de muestras de tela** que filtra el catálogo por **tipo de espacio**; todo lo demás es una tienda en línea clara y familiar (header, buscador, categorías, grilla, ficha), al nivel de IKEA.com o Amazon.com en estructura, no en estética.

El azul de la marca (el del logo) ocupa el header completo: es un compromiso de color, no un acento suelto. Un dorado cálido se reserva para lo que lleva al showroom (agendar visita). El fondo es un gris frío derivado del azul; las tarjetas son blancas, planas y con borde de 1px.

El sitio es **mobile-first**: la mayoría de visitantes llega desde Instagram en el teléfono. En móvil, una barra fija inferior mantiene siempre visible el presupuesto en curso.

**Key Characteristics:**
- Header azul de marca, completo; barra de categorías blanca debajo.
- Tira de muestras por tipo de espacio como único gesto expresivo.
- Dorado solo para "Agendar visita" y lo relacionado con el showroom.
- Superficies planas, bordes de 1px, sombras solo en lo que flota.
- Barra de presupuesto fija en móvil con total referencial en cifras tabulares.
- Precio siempre como "Precio referencial", nunca como precio de compra.

## Colors

Azul de marca comprometido sobre neutros fríos, con un dorado de showroom y estados claros.

### Primary
- **Azul Silla** (#1F80E0): el azul del logo. Fondo del header, indicador de categoría activa (subrayado de 2px), anillo de foco, muestra "Gerencial". Con texto blanco solo para íconos y texto ≥19px en negrita (contraste ~4.0:1).
- **Azul Acción** (#1566B8, hover #12579F): botones principales y enlaces. Contraste ~5.6:1 con blanco.
- **Tinte Azul** (#E8F1FC): fondos suaves de filtros activos y estados seleccionados.

### Secondary
- **Dorado Showroom** (#E4A11B): botón y chip "Agendar visita", punto indicador de showroom. Siempre con texto `ink` encima; nunca como color de texto sobre blanco.

### Neutral
- **Fondo Frío** (#F3F5F8): fondo de página.
- **Superficie** (#FFFFFF): tarjetas, buscador, barra de categorías, barra de presupuesto.
- **Línea** (#DCE2EA): bordes y divisores, siempre de 1px.
- **Tinta** (#14171C): títulos y texto.
- **Tinta Suave** (#5B6573): "Precio referencial", metadatos, categorías inactivas.
- **Malla Negra** (#14171C): fondo del footer.

### Estados y canales
- **WhatsApp** (#0F7A43): solo el botón "Enviar por WhatsApp", con su ícono. El verde oficial (#25D366) no alcanza contraste con texto blanco.
- **Éxito** (#1E7F4F / fondo #E7F5EE): "Agregado a tu presupuesto", cita confirmada.
- **Error** (#C62F2F / fondo #FDECEC): errores de formulario o de carga.
- **Aviso** (#9A5B00 / fondo #FFF4E0): avisos.

### Muestras (tipo de espacio)
Un color por valor de `tipoEspacio`, asignado en un solo mapa del frontend:
- `GERENCIAL` → Azul Silla (#1F80E0)
- `OPERATIVO` → Malla Negra (#2B2F36)
- Reservados para los tipos que aún no define `API.md`: Gris Oxford (#6E7783), Madera (#8A6A4B), Gris Claro (#C9CFD7, con texto `ink`).
- Un tipo sin color asignado usa Gris Oxford. **No inventar tipos de espacio**: la tira muestra solo los que vienen de la API.

### Named Rules
**La regla del dorado.** El dorado significa "showroom". Si no lleva a ver los muebles en persona, no es dorado.

**La regla del estado por forma.** Ningún estado depende solo del color: "En showroom" es una etiqueta con texto, la muestra elegida cambia de altura, la categoría activa se subraya.

## Typography

**Fuente única:** Figtree (Google Fonts, pesos 400/500/600/700/800), con `system-ui, sans-serif` de respaldo.

**Character:** sans geométrica cálida y redondeada; cercana para quien llega de Instagram y lo bastante sobria para la empresa que equipa una oficina.

### Hierarchy
- **Display** (800, 28px → 36px, 1.2): título del inicio.
- **Headline** (700, 24px → 30px, 1.22): título de página o de producto.
- **Title** (700, 20px → 24px, 1.28): títulos de sección.
- **Card title** (600, 16px, 1.35): nombre del producto en tarjetas; máximo 2 líneas.
- **Body** (400, 16px, 1.5): texto general y descripciones, máximo ~70ch. 16px en inputs evita el zoom de iOS.
- **Small** (500, 13px → 14px, 1.4): metadatos y ayudas.
- **Label** (700, 11px, +0.12em, MAYÚSCULAS): "TIPO DE ESPACIO", "EN SHOWROOM", encabezados del footer.
- **Price** (700, 16px → 18px, cifras tabulares): precio en tarjeta. **Price large** (800, 28px) en la ficha.

### Named Rules
**La regla de la escala corta.** No se agregan tamaños nuevos: la jerarquía se gana con peso y mayúsculas.

**La regla de las cifras.** Todo precio, cantidad o total usa cifras tabulares (`tabular-nums`) y se formatea con `Intl.NumberFormat`.

## Layout

- **Ritmo:** base de 4px — 4, 8, 12, 16, 24, 32, 48, 64. Más espacio encima de un título que debajo.
- **Contenedor:** ancho máximo 1280px; margen lateral 16px (móvil), 24px (tablet ≥768px), 32px (escritorio ≥1024px).
- **Grilla de productos:** 2 columnas en móvil, 3 en tablet, 4 en escritorio; separación 12px → 16px → 24px. Se reacomoda por columnas completas, nunca tarjetas a medio ancho.

### Header — escritorio (≥1024px)
```
┌───────────────────────────────────────────────────────────────────────┐
│ AZUL SILLA (72px)                                                     │
│ [■] Mobiliario  [ Buscar sillas, escritorios, mesas…    ⌕ ]           │
│     de Oficina  [● Agendar visita]   👤 Mi cuenta   ♡ 2   🛒 3 · $720  │
├───────────────────────────────────────────────────────────────────────┤
│ BLANCO (48px)  ☰ Todas │ Sillería  Escritorios  Mesas  …  ✓ En showroom │
└───────────────────────────────────────────────────────────────────────┘
```
- Logo: el PNG cuadrado (`src/assets/logo.png`) a 40px con radio `md`, junto al nombre en texto blanco (≥19px, 800).
- Buscador ancho y centrado; "Agendar visita" con `button-visit`.
- El carrito muestra cantidad y total referencial; abre un drawer lateral.
- Categorías desde `GET /api/v1/categorias`; "Todas" abre un panel con la lista completa. Activa: subrayado Azul Silla de 2px.
- Al hacer scroll la fila blanca se oculta; la azul queda fija con sombra `sm`.

### Header — móvil (<768px)
```
┌──────────────────────────────────┐
│ AZUL  [■] Mobiliario    ♡   🛒3   ☰ │  ← fijo
│ [ ⌕ Buscar sillas, escritorios… ]   │  ← fijo
├──────────────────────────────────┤
│ [● Agendar visita] Sillería Escritorios → │  ← chips con scroll horizontal
└──────────────────────────────────┘
```
- "Agendar visita" es siempre el primer chip (`chip-visit`).
- La fila de chips se oculta al bajar y reaparece al subir.
- Menú ☰ (drawer): cuenta (ingresar / registrarse), todas las categorías, en showroom, agendar visita, contacto.

### Barra de presupuesto — móvil
```
┌──────────────────────────────────┐
│ Mi presupuesto · 3      ref. $720 │
│ [ Solicitar cotización ] [WhatsApp]│
└──────────────────────────────────┘
```
- Fija abajo, fondo blanco, sombra `lg`, respeta `env(safe-area-inset-bottom)`.
- Con productos: resumen + `button-primary` "Solicitar cotización" + `button-whatsapp`.
- Lista vacía: "¿Quieres verlas en persona?" + `button-visit` "Agendar visita".
- Se oculta en las vistas de presupuesto/carrito, cita, login y registro.
- En escritorio no existe: su función la cumple el carrito del header.

### Footer
- **Escritorio:** fondo Malla Negra con franja superior de 4px formada por los colores de las muestras. Cuatro columnas:
  1. Marca (logo + nombre + una línea) e Instagram.
  2. Catálogo: categorías de la API (máx. 6), "En showroom".
  3. Showroom: dirección, horario, `button-visit` "Agendar visita", "Cómo llegar".
  4. Contacto: `button-whatsapp`, teléfono, email, @mobiliariodeoficina.
  - Fila inferior: "© 2026 Mobiliario de Oficina · Los precios son referenciales; el precio final se confirma en la cotización."
- **Móvil:** una columna en orden de utilidad — Showroom → Contacto (WhatsApp a todo el ancho) → Catálogo en acordeón → aviso. Relleno inferior extra para que la barra de presupuesto no tape contenido.

## Elevation & Depth

Plano por defecto: las superficies en reposo no tienen sombra, se separan con el borde de 1px y el contraste blanco sobre Fondo Frío. Las sombras aparecen solo en lo que flota sobre el contenido.

### Shadow Vocabulary
- **sm** (`box-shadow: 0 1px 2px rgba(20,23,28,.06)`): header fijo después de hacer scroll.
- **lg** (`box-shadow: 0 10px 28px rgba(20,23,28,.14)`): menús desplegables, drawer, barra de presupuesto, muestra seleccionada.

### Named Rules
**La regla de lo que flota.** Si no está encima de otra cosa, no lleva sombra.

## Shapes

- **Radios:** `sm` 6px (chips, etiquetas), `md` 10px (botones, inputs, tarjetas, muestras, logo), `lg` 16px (drawer, modales), `full` (contadores).
- **Líneas:** siempre 1px y color Línea. Un solo peso en todo el sitio.
- **Muestra:** tarjeta de 84×112px con radio `md` arriba y 6px abajo, y un ojal circular de 11px cerca de la esquina superior izquierda (el agujero del aro).

## Components

### Tira de muestras (firma)
- En el inicio y en las páginas de categoría, encima de la grilla; nunca en el header.
- Etiqueta "TIPO DE ESPACIO" (`label`) y, debajo, una muestra por `tipoEspacio` de la API: nombre (700, 14px) y cantidad de productos (`label`).
- Las muestras se superponen como abanico (−18px). La seleccionada se separa, crece a 132px, toma sombra `lg` y es la única con textura sutil (trama diagonal).
- Tocar una muestra filtra la grilla al instante, sin recargar; tocarla de nuevo quita el filtro.
- Es un grupo de botones accesible (`aria-pressed`); en móvil hace scroll horizontal.

### Tarjeta de producto
- Superficie blanca, borde 1px, radio `md`, sin sombra.
- Foto (proporción fija) con `tag-showroom` "EN SHOWROOM" arriba a la derecha si `enShowroom`, y `chip-material` con el texto de `material` abajo a la izquierda (sin color: la API no da colores de material).
- Nombre (`card-title`, 2 líneas), "Precio referencial" (`small`, Tinta Suave) y el precio (`price`).
- La misma tarjeta se reconoce en todas sus escalas: miniatura del drawer, tarjeta de grilla y ficha.

### Botones
- **Primario** (Azul Acción): "Solicitar cotización", "Agregar al presupuesto".
- **Visita** (Dorado Showroom, texto Tinta): "Agendar visita".
- **WhatsApp** (verde WhatsApp, con ícono): "Enviar por WhatsApp".
- **Secundario** (blanco, borde y texto Azul Acción): acciones de apoyo.
- Altura mínima 44px para toque; foco visible con anillo Azul Silla de 2px y 2px de separación.

### Buscador
- Blanco, radio `md`, 46px, ícono de lupa, placeholder "Buscar sillas, escritorios, mesas…".

## Do's and Don'ts

**Do**
- Mostrar el precio como "Precio referencial" o "Desde $X".
- Sacar categorías y tipos de espacio de la API.
- Usar el mismo movimiento en todo el sitio (~200ms, `ease-out`) y respetar `prefers-reduced-motion` (cambio instantáneo).
- Manejar en cada vista los estados cargando, error y vacío.
- Marcar los datos pendientes (dirección y horario del showroom, WhatsApp, teléfono, email) como pendientes, no inventarlos.

**Don't**
- No usar el dorado fuera de lo relacionado con el showroom.
- No poner texto blanco pequeño sobre Azul Silla; para botones usar Azul Acción.
- No aplicar textura a varias muestras a la vez ni a otros elementos.
- No agregar sombras a tarjetas en reposo.
- No inventar tipos de espacio, testimonios, cifras ni colores de material.
- No enlazar imágenes del CDN de Instagram.
