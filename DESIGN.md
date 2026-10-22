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
  line-strong: "#7D8796"
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
  swatch-oficina: "#1566B8"
  swatch-hogar: "#8A6A4B"
  swatch-salon-belleza: "#2B2F36"
  swatch-consultorio: "#C9CFD7"
  swatch-fallback: "#6E7783"
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
  wordmark:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
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
  card-product:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  swatch:
    rounded: "{rounded.md}"
    width: "120px"
    height: "136px"
  swatch-selected:
    height: "156px"
  cart-dock:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "12px 16px 20px"
  footer:
    backgroundColor: "{colors.footer-mesh}"
    textColor: "{colors.surface}"
---

# Design System: Mobiliario de Oficina

> Dirección aprobada el 2026-10-18 («Muestrario de tapicería», con la barra de cotización móvil incorporada). Actualizado el 2026-10-20: muestras con los cuatro `tipoEspacio` de la API, sin cantidad de productos, y "cotización" en lugar de "presupuesto" en toda la interfaz. También el 2026-10-20: se agrega la página de búsqueda (`/buscar`). Es un documento **previo a la implementación**: cuando exista el código, se vuelve a generar desde el código real (`/impeccable document`) para que no se separe de lo construido.

## Overview

**Creative North Star: "El muestrario del showroom"**

La tienda se usa como se elige en el showroom: tocando la muestra. La firma del sistema es una **tira de muestras de tela** que filtra el catálogo por **tipo de espacio**; todo lo demás es una tienda en línea clara y familiar (header, buscador, categorías, grilla, ficha), al nivel de IKEA.com o Amazon.com en estructura, no en estética.

El azul de la marca (el del logo) ocupa el header completo: es un compromiso de color, no un acento suelto. Un dorado cálido se reserva para lo que lleva al showroom (agendar visita). El fondo es un gris frío derivado del azul; las tarjetas son blancas, planas y con borde de 1px.

El sitio es **mobile-first**: la mayoría de visitantes llega desde Instagram en el teléfono. En móvil, una barra fija inferior mantiene siempre visible la cotización en curso.

**Key Characteristics:**
- Header azul de marca, completo; barra de categorías blanca debajo.
- Tira de muestras por tipo de espacio como único gesto expresivo.
- Dorado solo para "Agendar visita" y lo relacionado con el showroom.
- Superficies planas, bordes de 1px, sombras solo en lo que flota.
- Barra de cotización fija en móvil con total referencial en cifras tabulares.
- Precio siempre como "Precio referencial", nunca como precio de compra.

## Colors

Azul de marca comprometido sobre neutros fríos, con un dorado de showroom y estados claros.

### Primary
- **Azul Silla** (#1F80E0): el azul del logo. Fondo del header, indicador de categoría activa (subrayado de 2px), anillo de foco. Con texto blanco solo para íconos y texto ≥19px en negrita (contraste ~4.0:1).
- **Azul Acción** (#1566B8, hover #12579F): botones principales, enlaces y muestra "Oficina". Contraste ~5.8:1 con blanco.
- **Tinte Azul** (#E8F1FC): fondos suaves de filtros activos y estados seleccionados.

### Secondary
- **Dorado Showroom** (#E4A11B): botón y chip "Agendar visita", punto indicador de showroom. Siempre con texto `ink` encima; nunca como color de texto sobre blanco.

### Neutral
- **Fondo Frío** (#F3F5F8): fondo de página.
- **Superficie** (#FFFFFF): tarjetas, buscador, barra de categorías, barra de cotización.
- **Línea** (#DCE2EA): bordes y divisores, siempre de 1px.
- **Línea de campo** (#7D8796): borde de los campos de formulario (`BaseInput`). Un control tiene que distinguirse de su fondo (WCAG 1.4.11): 3.6:1 sobre Superficie y 3.3:1 sobre Fondo Frío; Línea no llega (1.3:1).
- **Tinta** (#14171C): títulos y texto.
- **Tinta Suave** (#5B6573): "Precio referencial", metadatos, categorías inactivas.
- **Malla Negra** (#14171C): fondo del footer.

### Estados y canales
- **WhatsApp** (#0F7A43): solo el botón "Enviar por WhatsApp", con su ícono. El verde oficial (#25D366) no alcanza contraste con texto blanco.
- **Éxito** (#1E7F4F / fondo #E7F5EE): "Agregado a tu cotización", cita confirmada.
- **Error** (#C62F2F / fondo #FDECEC): errores de formulario o de carga.
- **Aviso** (#9A5B00 / fondo #FFF4E0): avisos.

### Muestras (tipo de espacio)
Un color, un ícono (lucide) y un nombre por valor de `tipoEspacio`, asignados en un solo mapa del frontend. Contrastes medidos para el nombre (700, 14px) y el ícono sobre la muestra:
- `OFICINA` → Azul Acción (#1566B8), texto blanco (5.8:1), ícono `Briefcase`.
- `HOGAR` → Madera (#8A6A4B), texto blanco (5.0:1), ícono `Home`.
- `SALON_BELLEZA` → Malla Negra (#2B2F36), texto blanco (13.4:1), ícono `Scissors`.
- `CONSULTORIO` → Gris Claro (#C9CFD7), texto `ink` (11.5:1), ícono `Stethoscope`. Lleva borde Línea de 1px porque casi no se separa del Fondo Frío.
- Un tipo nuevo sin entrada en el mapa usa Gris Oxford (#6E7783, texto blanco 4.5:1, justo en el límite de AA) y un ícono genérico. **No inventar tipos de espacio**: la tira muestra solo los que vienen de la API.
- Azul Silla (#1F80E0) **no** se usa en muestras: con texto de 14px no llega a AA ni con blanco (4.0:1) ni con tinta (4.5:1 justo en el límite).
- `tipoEspacio` es un valor único, como lo devuelve hoy el backend. Si pasa a ser lista, el cambio se resuelve en `productoService`, no en las vistas.

### Named Rules
**La regla del dorado.** El dorado significa "showroom". Si no lleva a ver los muebles en persona, no es dorado.

**La regla del estado por forma.** Ningún estado depende solo del color: "En showroom" es una etiqueta con texto, la muestra elegida cambia de altura, la categoría activa se subraya.

## Typography

**Fuente única:** Figtree (Google Fonts, pesos 400/500/600/700/800), con `system-ui, sans-serif` de respaldo.

**Character:** sans geométrica cálida y redondeada; cercana para quien llega de Instagram y lo bastante sobria para quien compra en volumen (empresas, negocios).

### Hierarchy
- **Display** (800, 28px → 36px, 1.2): título del inicio.
- **Headline** (700, 24px → 30px, 1.22): título de página o de producto.
- **Title** (700, 20px → 24px, 1.28): títulos de sección.
- **Wordmark** (800, 19px, 1.05, −0.01em): solo el nombre "Mobiliario de Oficina" junto al logo, en header y footer (`text-wordmark`).
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
  - Excepción: en la página de búsqueda, con la barra lateral de filtros, la grilla de escritorio tiene 3 columnas.

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
- **Cuenta** (`AccountMenu`, decidido el 2026-10-21): sin sesión, ícono de usuario que lleva a `/login`. Con sesión, botón con la **inicial** en un círculo blanco con letra Azul Acción + chevron (el nombre en texto blanco pequeño sobre Azul Silla no llega a AA). Abre un menú (sombra `lg`, radio `lg`) con "Sesión iniciada como [usuario]", "Mi perfil" y "Cerrar sesión". Patrón *menu button*: flechas, Inicio/Fin, Escape devuelve el foco al botón, se cierra al hacer clic fuera, con Tab y al cambiar de página. Al cerrar sesión en una página que exige sesión, se vuelve al inicio.
- El carrito muestra cantidad y total referencial; abre un drawer lateral.
- Categorías desde `GET /api/v1/categorias`; "Todas" abre un panel con la lista completa. Activa: subrayado Azul Silla de 2px.
- Al hacer scroll la fila blanca se oculta; la azul queda fija con sombra `sm`.
- **Pantallas bajas** (alto menor a 32em: zoom al 200%, letra grande del sistema, teléfono acostado): la franja azul y la barra "Filtros / Ordenar" de `/buscar` dejan de ser fijas y se van con la página, para no tapar la mitad de la pantalla (WCAG 1.4.10). Se usa la variante `short:` de `style.css`; al medir en `em`, el umbral crece con la letra que eligió la persona.
  - **Pendiente (fase de pulido):** ocultar la fila de categorías según la dirección del scroll. Hoy la franja azul es fija y toma la sombra `sm`, y la fila blanca simplemente se desplaza con la página.

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
  - **Pendiente (fase de pulido):** hoy la fila de chips no es fija y se va con la página; falta que reaparezca al subir.
- Menú ☰ (drawer, también en tablet): cuenta (sin sesión: "Ingresar" / "Crear cuenta"; con sesión: inicial y nombre, "Mi perfil", "Cerrar sesión"), todas las categorías, en showroom, agendar visita, contacto.

### Barra de cotización — móvil
```
┌──────────────────────────────────┐
│ Mi cotización · 3       ref. $720 │
│ [ Ver mi cotización ]  [WhatsApp]  │
└──────────────────────────────────┘
```
- Fija abajo, fondo blanco, sombra `lg`, respeta `env(safe-area-inset-bottom)`.
- Con productos: resumen + `button-primary` "Ver mi cotización" (lleva a `/carrito`: llevar no es solicitar) + `button-whatsapp`.
- Lista vacía: "¿Quieres verlas en persona?" + `button-visit` "Agendar visita".
- Se oculta en las vistas de cotización/carrito, cita, login y registro.
- En la ficha de producto la reemplaza la **barra del producto**: selector de cantidad + `button-primary` "Agregar a la cotización" (WhatsApp y visita quedan en el contenido de la ficha, no en la barra). Mismo fondo, sombra `lg` y `env(safe-area-inset-bottom)`; la página reserva espacio al final para que la barra no tape los relacionados ni el footer.
- En escritorio no existe: su función la cumple el carrito del header.

### Footer
- **Escritorio:** fondo Malla Negra con franja superior de 4px formada por los colores de las muestras. Cuatro columnas:
  1. Marca (logo + nombre + una línea) e Instagram.
  2. Catálogo: categorías de la API (máx. 6), "En showroom".
  3. Showroom: dirección, horario, `button-visit` "Agendar visita", "Cómo llegar".
  4. Contacto: `button-whatsapp`, teléfono, email, @mobiliariodeoficina.
  - Fila inferior: "© 2026 Mobiliario de Oficina · Los precios son referenciales; el precio final se confirma en la cotización."
- **Móvil:** una columna en orden de utilidad — Showroom → Contacto (WhatsApp a todo el ancho) → Catálogo en acordeón → aviso. Relleno inferior extra para que la barra de cotización no tape contenido.

## Elevation & Depth

Plano por defecto: las superficies en reposo no tienen sombra, se separan con el borde de 1px y el contraste blanco sobre Fondo Frío. Las sombras aparecen solo en lo que flota sobre el contenido.

### Shadow Vocabulary
- **sm** (`box-shadow: 0 1px 2px rgba(20,23,28,.06)`): header fijo después de hacer scroll.
- **lg** (`box-shadow: 0 10px 28px rgba(20,23,28,.14)`): menús desplegables, drawer, barra de cotización, muestra seleccionada.

### Named Rules
**La regla de lo que flota.** Si no está encima de otra cosa, no lleva sombra.

## Shapes

- **Radios:** `sm` 6px (chips, etiquetas), `md` 10px (botones, inputs, tarjetas, muestras, logo), `lg` 16px (drawer, modales), `full` (contadores).
- **Líneas:** siempre 1px y color Línea (Línea de campo en los inputs). Un solo peso en todo el sitio.
- **Muestra:** tarjeta de 120×136px (156px la elegida) con radio `md` arriba y 6px abajo, y un ojal circular de 11px a 30px del borde izquierdo y 18px del superior: es un agujero real (`mask-image`), fuera de la franja de 18px que se monta sobre la muestra anterior, así que por él se ve el fondo. Es más ancha que el boceto original (84px) para que "Consultorio" quepa a 14px en negrita.

## Components

### Tira de muestras (firma)
- En el inicio y en las páginas de categoría, encima de la grilla; nunca en el header.
- Etiqueta "TIPO DE ESPACIO" (`label`) y, debajo, una muestra por `tipoEspacio` de la API: ícono (20px) arriba y nombre (700, 14px) debajo. **No muestra la cantidad de productos.** Ningún ambiente se distingue solo por el color: el ícono y el nombre siempre están.
- Las muestras se superponen como abanico (−18px). La seleccionada se separa, crece a 156px, toma sombra (como `drop-shadow`, porque la máscara recortaría una `box-shadow`) y es la única con textura sutil (trama diagonal); la trama no baja el contraste del nombre por debajo de AA.
- Tocar una muestra filtra la grilla al instante, sin recargar; tocarla de nuevo quita el filtro. Mientras llega la respuesta, la grilla muestra skeletons; una respuesta vieja que llega tarde se descarta.
- En el inicio filtra los productos en showroom (máximo 4) y debajo ofrece "Ver todos los de [ambiente]" → `/buscar?tipoEspacio=VALOR`.
- Es un grupo de botones accesible (`aria-pressed`); en móvil hace scroll horizontal.

### Tarjeta de categoría
- Enlaza a `/categoria/:slug`. Móvil: fila (miniatura de 72px, nombre y descripción, flecha). Desde tablet: tarjeta vertical en 5 columnas con imagen 4:3; la descripción se oculta en tablet y vuelve en escritorio.
- Imagen opcional desde `src/config/categorias.js` (por slug). Sin foto o si falla: la **silueta de alzado** del mueble (`CategorySilhouette`), en Tinta Suave sobre Fondo Frío, con su línea de piso; en hover pasa a Azul Acción.
- Siluetas: dibujos de alzado sin perspectiva, lienzo 160×120 con el piso en y = 104, trazo de 2px que no escala. Peinadores se dibuja como tocador con espejo (sirve para salón y para casa).

### Hero del inicio
- Texto a la izquierda (título `display`, texto, "Ver catálogo" primario + "Agendar visita" dorado, dirección y horario de `config/empresa.js`). Sin etiqueta encima del título.
- A la derecha (debajo en móvil), la **vitrina**: las cinco siluetas sobre una línea de piso, con la etiqueta `tag-showroom` "Showroom en San Diego". Cuando `company.showroom.photoUrl` tenga valor, la foto del showroom la reemplaza.

### Login y registro (`/login`, `/registro`) — textos decididos el 2026-10-21
- **Aviso "sin cuenta":** "No necesitas cuenta para cotizar ni para escribirnos por WhatsApp." No menciona las visitas mientras `POST /api/v1/citas` exija token (pendiente 10-quater de `API.md`); si se vuelven públicas, se agregan al aviso.
- **Para qué sirve la cuenta:** solo lo que es cierto hoy: "Con una cuenta puedes agendar visitas a nuestro showroom." Sin "ver tus citas" ni beneficios futuros. Se amplía cuando existan:
  - "Tus datos se completan solos al pedir una cotización" (Fase 7).
  - "Revisa tus citas" (si el backend agrega un `GET` de las citas del usuario).
- **Estructura** (`AuthLayout`, común a las dos): header y footer normales, sin barra de cotización. Columna centrada (`max-w-md`); en móvil los campos van sobre el Fondo Frío y desde `sm`, en una tarjeta blanca plana con borde de 1px. Orden: título (`headline`) → frase de beneficio → "Continuar con Google" → separador ("o con tu usuario o correo" / "o con tu correo") → formulario → "¿Primera vez aquí? Crea tu cuenta" / "¿Ya tienes cuenta? Ingresa" (conserva `?redirect=`) → aviso "sin cuenta" en Tinte Azul con "Ver catálogo". Nada dorado.
- **Google:** botón oficial de Google Identity Services, que se carga solo en estas pantallas. Sin `VITE_GOOGLE_CLIENT_ID` se ocultan el botón y el separador; si el script no carga, también. Botón simulado solo con mocks y en `npm run dev`.
- **Campos:** login, "Usuario o correo" + "Contraseña" con "¿Olvidaste tu contraseña? Escríbenos por WhatsApp" debajo (no hay recuperación de contraseña en el backend). Registro, "Nombre de usuario" + "Correo" + "Contraseña" (mínimo 8 caracteres). Botón para mostrar la contraseña en lugar de "Repetir contraseña".
- **Errores:** se validan al enviar y después al salir de cada campo. Login fallido: un solo aviso, "Usuario o contraseña incorrectos.". Usuario o correo repetido: error en su campo (con "Ingresar con ese correo" si es el correo). Fallos de red o servidor: aviso sobre el botón.

### Agendar visita (`/agendar-cita`) — decidido el 2026-10-21
- **Exige sesión** (`meta.requiereSesion`) mientras `POST /api/v1/citas` pida token (pendiente 10-quater de `API.md`). Sin barra de cotización.
- **Estructura:** título + una línea. Escritorio: formulario a la izquierda (tarjeta blanca con secciones separadas por línea) y el resumen "Tu visita" a la derecha, fijo (sticky). Móvil: una columna; el resumen va al final, justo antes del envío. **Un solo botón** "Agendar visita" (`button-visit`, dorado), dentro del resumen. El resumen dice "Elige un día" / "Elige una hora" mientras falten.
- **Tipo de asesoría:** radios nativos en un `fieldset` con `legend`, con forma de tarjeta (nombre + descripción). Elegida: Tinte Azul, borde Azul Acción y check. "Visita al showroom" va primera, preseleccionada y con el punto dorado. En móvil, la descripción ocupa una línea salvo en la elegida.
- **Día:** tira horizontal de tarjetas (día de la semana + número), con los días con atención de los próximos `diasAnticipacionCita` días (30, en `config/empresa.js`); sin domingos. El nombre del mes aparece donde empieza cada mes y queda pegado a la izquierda al deslizar. Radios nativos ocultos: se recorre con las flechas. En escritorio, botones anterior/siguiente junto al título "Día y hora".
- **Hora:** botones con `aria-pressed`, agrupados en "Mañana" y "Tarde". Cambiar de día borra la hora.
- **Datos:** nombre, empresa o negocio (opcional), teléfono venezolano, correo y notas (opcional). Se validan al enviar y después al salir de cada campo; el foco va al primer error.
- **Prellenado:** borrador recuperado > datos de la cuenta (hoy solo el correo, si el usuario tiene forma de correo) > `?producto=ID`, que muestra el producto en el resumen y escribe "Me interesa: …" en las notas si están vacías. Un producto que no existe se ignora.
- **Sesión vencida:** lo escrito se guarda en `sessionStorage`, se lleva al login con `?redirect=` y al volver se recupera con el aviso "Recuperamos lo que habías escrito" (Tinte Azul). Si el horario ya pasó, se pide elegir otro.
- **Confirmación (`/agendar-cita/confirmacion?codigo=…`):** página propia; se llega con `replace` al crear la cita. Ícono de Éxito, "Tu visita quedó agendada", el código de la cita grande con "Copiar código" ("Copiado" anunciado por `role="status"`; si el portapapeles falla, el código queda seleccionado y se dice cómo copiarlo), resumen (asesoría, día, hora, lugar), `button-whatsapp` "Avisar por WhatsApp" (mensaje con código, tipo, fecha y hora; **el único WhatsApp destacado** de la pantalla) y "Agregar a mi calendario" (.ics, secundario). Debajo, "¿Necesitas cambiarla o cancelarla?": botón secundario a `/mi-cita` y el enlace de texto "o escríbenos por WhatsApp" con el código ya escrito.
- **Citas guardadas:** cada cita creada se guarda en `localStorage` (`src/utils/citasGuardadas.js`) con todo su `CitaRequest` y el código, para reprogramarla con PUT. La confirmación lee de ahí: recargarla no crea otra cita. Sin una cita de las últimas 24 h con ese código, la ruta lleva a `/agendar-cita`.

### Mis visitas (`/mi-cita`) — decidido el 2026-10-21
- **Exige sesión:** `PUT` y `DELETE` de citas piden token. Enlace "Mis visitas" (ícono `CalendarDays`) en el menú de cuenta y en el menú lateral, bajo "Mi perfil".
- **Fuente de datos:** las citas guardadas en este navegador (`citasGuardadas.js`); se actualiza si otra pestaña las cambia. Aviso fijo en Tinte Azul: "Aquí aparecen solo las citas agendadas desde este navegador. Para otras, escríbenos por WhatsApp con tu código." Cuando exista un `GET` de citas (pendientes 16 y 17 de `API.md`), se piden al backend.
- **Próximas visitas:** tarjetas blancas planas, de la más cercana a la más lejana. A la izquierda, la fecha como en la tira de días (día de la semana + número, sobre Fondo Frío); al lado, el día completo, la hora, el tipo (con el punto dorado si es visita al showroom) y el código. Acciones: "Reprogramar" (secundario) y "Cancelar visita" (ghost). Sin próximas: "No tienes visitas próximas" + `button-visit` "Agendar visita".
- **Reprogramar:** se abre dentro de la tarjeta (una a la vez), con el mismo selector de día y hora del formulario (`AppointmentSlotPicker`), "Ahora: …" y "Nuevo horario: …". "Guardar nuevo horario" (primario) y "No cambiar". Envía `PUT` con el `CitaRequest` guardado y la nueva fecha; el mismo horario que ya tiene da error en el campo. Al guardar: aviso breve "Listo: tu visita quedó para el …" y el foco al título de la tarjeta.
- **Cancelar:** diálogo de confirmación (`BaseConfirmDialog`: abajo en móvil, centrado desde `sm`) con "¿Cancelar tu visita del jueves 20 de noviembre?", tipo, hora y código. "No, mantenerla" (secundario, con el foco inicial) y "Sí, cancelar visita" (botón `danger`, Error con texto blanco). Al confirmar: la tarjeta sale de la lista, aviso breve "Cancelamos tu visita del …" y el foco al título "Próximas visitas". Un fallo de red deja el diálogo abierto con el error.
- **Cita que ya no existe** (`404`; hoy el backend da `500`, pendiente 12-bis): se quita de la lista y aparece un aviso (fondo Aviso) con el día y el código, y "¿Crees que es un error? Escríbenos por WhatsApp".
- **Sesión vencida** al enviar: se cierra la sesión y se lleva al login con `?redirect=/mi-cita`.
- **Visitas anteriores:** las que ya empezaron (hora de Caracas), en una lista compacta debajo, de la más reciente a la más vieja, sin acciones.

### Mi cotización (`/carrito`) — decidido el 2026-10-21
- **Título de la pestaña:** "Mi cotización (N)", con N = unidades; sin productos, "Mi cotización".
- **Al entrar** se pide el catálogo una vez (`GET /api/v1/productos`) y se reconcilia la lista. Mientras llega, la lista se ve con la copia guardada y junto al título "Resumen" aparece "Revisando precios…" (no mueve la página). Si falla: aviso (fondo Aviso) "No pudimos revisar los precios actuales…" con "Reintentar"; la lista sigue sirviendo.
- **Estructura:** escritorio, lista (y formulario) a la izquierda y "Resumen" fijo a la derecha (sticky, salvo en pantallas bajas). Móvil y tablet: lista → "Vaciar mi cotización" → resumen → barra fija → formulario. La barra fija se detiene al terminar el resumen, así no tapa el formulario.
- **Línea:** foto 4:5 (80 → 96px), categoría, nombre (enlace a la ficha), "Precio referencial $X c/u", subtotal (`price`) a la derecha, selector de cantidad (1–99, − / + / campo; flechas ↑↓) y "Quitar" (ghost).
- **No disponible** (salió del catálogo): foto atenuada en gris, nombre en Tinta Suave, "Ya no está disponible" (Aviso, con ícono) y "Salió del catálogo, así que no suma al total"; sin selector de cantidad; "Quitar" con borde (secundario). El resumen dice "No disponibles: N, no suman". Si ninguno sigue disponible, no hay envío: aviso con enlace al catálogo.
- **Quitar → Deshacer:** la línea se reemplaza en su lugar por "**Producto quitado** · [nombre]  ↶ Deshacer" durante 6 s (no se va mientras el puntero o el foco están en ella). El foco pasa a "Deshacer"; al deshacer, el producto vuelve a su posición y el foco a su nombre. Se anuncia por `role="status"`. Va en la lista y no en el aviso flotante para que con teclado esté a mano.
- **Resumen:** productos, unidades, "Total referencial" (`price-large`) y "Es un precio de referencia. El precio final te lo confirmamos al responder tu cotización."
- **Acciones según `VITE_COTIZACION_API`:**
  - `false`: `button-whatsapp` "Enviar por WhatsApp" es la única acción principal, con "Se abre WhatsApp con tu lista ya escrita. Tu cotización sigue guardada aquí." Sin botones deshabilitados ni "Pronto".
  - `true`: `button-primary` "Solicitar cotización" (lleva al formulario y enfoca el primer campo) y, debajo, "¿Prefieres escribirnos?" + `button-whatsapp`.
  - En móvil y tablet la acción principal va en la barra fija (total referencial + acción), y el resumen no la repite.
- **WhatsApp no vacía la lista** (no sabemos si se envió). Mensaje: una línea por producto "• 4 × Nombre (ref. $450 c/u)", el total referencial y el enlace a la tienda.
- **Vaciar mi cotización:** enlace discreto (Tinta Suave, subrayado, rojo al pasar) al final de la lista, nunca junto a los botones de enviar ni en la barra. Confirma con `BaseConfirmDialog`: "¿Vaciar tu cotización?", "No, mantenerla" / "Sí, vaciar" (`danger`). Después, aviso breve "Vaciamos tu cotización.".
- **Formulario** (`true`): "Solicitar cotización" + "Déjanos tus datos y te enviamos el precio final por WhatsApp o correo. No necesitas cuenta." Nombre y apellido, empresa o negocio (opcional), teléfono, correo, notas (opcional). Validación como en citas. "Enviar solicitud" (primario, `lg`) con "Se envían N productos (M unidades)". Si hay sesión, se prellena lo que da la cuenta (hoy solo el correo, si el usuario tiene forma de correo).
  - **Errores:** un `400` no dice qué falló, así que se vuelve a revisar el catálogo: si un producto dejó de existir, "Ya no está disponible: [nombre]. Lo marcamos en tu lista y no se enviará: vuelve a enviar tu solicitud." Si no, se revisan los campos y el foco va al primero con error. Red o servidor caído: mensaje sobre el botón y **se conserva todo** (datos escritos y lista).
- **Vacía:** "Tu cotización está vacía" + "Ver catálogo" y, separado, "¿Prefieres verlos en persona?" + `button-visit`.
- **Confirmación (`/carrito/confirmacion?codigo=…`):** se llega con `replace` tras el `201`; la lista se vacía (ahí sí sabemos que llegó). Ícono de Éxito, "Recibimos tu solicitud", "Te contactaremos por WhatsApp o correo…", código grande con "Copiar código", "Lo que pediste" (cantidad × nombre, subtotal, total referencial), `button-whatsapp` "Escríbenos por WhatsApp" con el código ya escrito y "Seguir viendo el catálogo". Lee la copia de `src/utils/cotizacionesEnviadas.js`: recargar no reenvía. Sin una solicitud de las últimas 24 h con ese código, lleva a `/carrito`.

### Aviso breve (`AppToast`, `useToast`)
- Confirma una acción que no deja otra señal visible; hoy, "Cerraste sesión.". Píldora Tinta con texto blanco e ícono de check, abajo al centro (como el aviso del servidor). Se va sola a los 4 s. Región `role="status"` siempre en el DOM para que se anuncie.
- Un solo aviso a la vez. En la Fase 7 lo puede usar "Agregado a tu cotización".

### Estado de error
- `BaseErrorState`: bloque blanco con borde, ícono de alerta en Error, título que nombra lo que falló y botón secundario "Reintentar".

### Imágenes de producto (estándar 4:5)
- Las fotos de producto vienen de Instagram en **1080 × 1350 px**: proporción vertical **4:5**. Es el estándar de imagen de producto en toda la tienda.
- Tarjeta de producto, su skeleton, imagen principal de la ficha y miniaturas de la galería usan `aspect-[4/5]`.
- Toda `<img>` de producto lleva `width="1080" height="1350"` (las miniaturas, `72 × 90`) para que el navegador reserve el espacio antes de cargar y no haya saltos de contenido.
- Si una foto no es 4:5, `object-cover object-center`: se recorta centrada, nunca se deforma ni deja franjas.
- En escritorio la galería de la ficha limita su ancho a `(100svh − 12rem) × 4/5` (mínimo 20rem) para que foto y miniaturas quepan en la pantalla junto a la información.
- Otras superficies (tarjeta de categoría 1:1 / 4:3, hero) pueden tener su propia proporción; si muestran una foto de producto, la recortan con `object-cover` centrado.

### Tarjeta de producto
- Superficie blanca, borde 1px, radio `md`, sin sombra. Toda la tarjeta enlaza a `/producto/:id` (enlace estirado sobre el nombre).
- Foto vertical 4:5 (`object-cover`, `loading="lazy"`) con `tag-showroom` "EN SHOWROOM" arriba a la derecha si `enShowroom`. Sin foto o si falla: placeholder `/placeholder-producto.svg`.
- La tarjeta **no** lleva el material: en la API es una frase larga y no cabe; se muestra completo en la ficha del producto.
- Categoría (`small`, Tinta Suave, 1 línea), nombre (`card-title`, máximo 2 líneas con espacio reservado para que los precios de una fila queden alineados), "Precio referencial" (`small`, Tinta Suave) y el precio (`price`). Sin precio: "Consultar precio".
- Botón de favorito a la derecha del precio: ícono de 20px con área táctil de 44px.
- Hover (solo en dispositivos con puntero): el borde se oscurece y la foto crece un 3%. Sin sombra, sin elevar la tarjeta.
- Versión de carga (skeleton) con la misma forma y medidas.
- La misma tarjeta se reconoce en todas sus escalas: miniatura del drawer, tarjeta de grilla y ficha.

### Botones
- **Primario** (Azul Acción): "Solicitar cotización", "Agregar a la cotización".
- **Visita** (Dorado Showroom, texto Tinta): "Agendar visita".
- **WhatsApp** (verde WhatsApp, con ícono): "Enviar por WhatsApp".
- **Secundario** (blanco, borde y texto Azul Acción): acciones de apoyo.
- **Peligro** (`danger`, Error #C62F2F con texto blanco, 5.1:1; hover #A82626): solo para confirmar algo que no se puede deshacer, dentro de un diálogo ("Sí, cancelar visita").
- Altura mínima 44px para toque; foco visible con anillo Azul Silla de 2px y 2px de separación.

### Agregar a la cotización
- **Se implementa en la Fase 7** (cuando exista el store del carrito). Hasta entonces el botón se ve, pero no simula una confirmación.
- Al agregar, la persona **no sale de la página**: el botón muestra brevemente "✓ Agregado" y aparece un aviso (Éxito) "Agregado a tu cotización" con el enlace "Ver mi cotización". El aviso se anuncia a lectores de pantalla (`aria-live="polite"`) y desaparece solo después de unos segundos.
- Si el producto ya está en la cotización, la cantidad **se suma** (3 + 2 = 5). La ficha lo indica junto al selector: "Ya tienes 3 en tu cotización".

### Buscador
- Blanco, radio `md`, 46px, ícono de lupa, placeholder "Buscar sillas, escritorios, mesas…".

### Página de búsqueda (`/buscar`, `SearchView`)
Página para hacer una tarea: patrones conocidos (IKEA, Amazon), sin adornos. Llegan desde el buscador del header (`?q=`), desde "Ver todos los de [ambiente]" en el inicio (`?tipoEspacio=`) y desde "En showroom" del header (`?enShowroom=true`).

**Encabezado** (franja blanca, como en Categoría): título "Resultados para «silla»" (sin texto: "Todos los productos") y el conteo "12 productos" con `aria-live="polite"` y cifras tabulares.

**Filtros**, en este orden:
1. **Categoría:** "Todas" + las de `GET /api/v1/categorias`.
2. **Ambiente:** los `tipoEspacio` con su ícono y nombre de `config/tiposEspacio.js`. La tira de muestras grande **no** se usa aquí (solo en el inicio y en Categoría).
3. **Solo en showroom:** interruptor con el punto Dorado Showroom; es lo único dorado de la página.
4. **Precio referencial (USD):** dos campos, "Desde" y "Hasta", con `inputmode="numeric"`; de placeholder, el mínimo y el máximo del catálogo. No aceptan negativos. Si "Desde" es mayor que "Hasta", aparece un mensaje en Error bajo los campos (`aria-describedby`) y no se filtra. Con un filtro de precio activo, los productos sin precio quedan fuera.
- Cada opción muestra cuántos productos tiene ("Hogar (3)"), contando con los demás filtros ya aplicados.
- Opción elegida: fondo Tinte Azul, borde Azul Acción y un check (no solo color).

**Orden:** Relevancia (por defecto), Precio: menor a mayor, Precio: mayor a menor, Nombre A–Z (`localeCompare('es')`). Ordenando por precio, los productos sin precio van al final. El orden no es un filtro: no cuenta en "Filtros (N)" ni lleva chip.

**Chips activos:** uno por filtro ("Sillería", "Ambiente: Hogar", "En showroom", "$100 – $400"), en Tinte Azul con borde Azul Acción y una X con área táctil de 44px y etiqueta "Quitar filtro Hogar". Al final, "Limpiar filtros", que quita los filtros pero **conserva el texto buscado**.

**Escritorio (≥1024px):**
- Barra lateral fija de ~256px con los filtros; se aplican **al momento**, porque la grilla está a la vista.
- Encima de la grilla: chips activos + "Limpiar filtros" a la izquierda, "Ordenar por" a la derecha.
- Grilla de 3 columnas (ver Layout).

**Móvil y tablet (<1024px):**
- Barra fija bajo el encabezado con "Filtros (N)" y "Ordenar". N cuenta solo filtros (ni orden ni texto buscado). Si los dos no caben lado a lado (letra grande), se apilan; en pantallas bajas la barra deja de ser fija (ver Header).
- Chips activos debajo, en fila con scroll horizontal, con "Limpiar filtros" al final.
- **Panel inferior** (`<dialog>` nativo, radio `lg`, sombra `lg`, máximo ~85% de la altura): cabecera con "Filtros", "Limpiar" y cerrar; los mismos grupos con scroll; abajo, fijo, "Ver X resultados".
  - Trabaja sobre un **borrador**: el botón cuenta en vivo los resultados que quedarían; si son 0, dice "Sin resultados" y queda deshabilitado.
  - "Limpiar" solo limpia el borrador. Cerrar con la X, Esc o tocando el fondo descarta el borrador.
  - Los campos de precio también se aplican con el botón, como los demás filtros.
  - Mientras está abierto se oculta la barra de cotización; respeta `env(safe-area-inset-bottom)`.
  - Sube en ~200ms `ease-out`; con `prefers-reduced-motion`, aparece sin animación.

**Estados:**
- Cargando: skeletons en la grilla; los conteos de filtros esperan. La carga pasa por `useAsync` (aviso de cold start).
- Error: `BaseErrorState` "No pudimos cargar los productos" + "Reintentar".
- Sin resultados para el texto: "No encontramos «xyz»", sugerencias (revisar la escritura, probar "silla" o "escritorio", ver todo el catálogo) y el bloque de WhatsApp.
- Sin resultados por los filtros: los chips activos, la sugerencia concreta del filtro que más resultados recupera ("Si quitas «Solo en showroom» verás 4 productos", con botón que lo quita), "Limpiar filtros" y el bloque de WhatsApp.
- Bloque de WhatsApp: "¿No encuentras lo que buscas? Escríbenos por WhatsApp" con `button-whatsapp` y mensaje ya escrito con lo buscado ("Hola, busqué «…» en la web y no lo encontré").

**URL:**
- Parámetros: `q`, `categoria` (slug), `tipoEspacio`, `enShowroom=true`, `precioMin`, `precioMax`, `orden` (`precio-asc` | `precio-desc` | `nombre`). Los valores por defecto no se escriben.
- Los cambios de filtro usan `router.replace` (no llenan el historial); una búsqueda nueva desde el header usa `push`.
- Valores inválidos (slug o tipo que no existe, precio no numérico o negativo) se ignoran y se limpian de la URL con `replace`; no generan chips.

**Decisiones (2026-10-20):**
- **Sin campo de búsqueda propio:** se usa el del header (en móvil ya está fijo y muestra el texto buscado). La página repite el texto en el título y ofrece "Borrar búsqueda", que quita `q` y conserva los filtros.
- **Búsqueda local:** el texto se busca en el navegador, palabra por palabra y sin tildes, en nombre, descripción, material y categoría ("melamina", "semicuero" o "silla malla" encuentran). El catálogo se pide una sola vez (ver la decisión en `API.md`).
- **Relevancia:** el backend no da puntuación. Primero los productos con todo el texto en el nombre, luego los que lo tienen en los otros campos; dentro de cada grupo, el orden de la API. Sin texto buscado, el orden de la API.
- **Una opción por grupo:** una sola categoría y un solo ambiente a la vez (como el `tipoEspacio` único del backend); la URL lleva un valor por parámetro.

## Do's and Don'ts

**Do**
- Mostrar el precio como "Precio referencial" o "Desde $X".
- Decir siempre "cotización", nunca "presupuesto", en textos de la interfaz.
- Sacar categorías y tipos de espacio de la API.
- Usar el mismo movimiento en todo el sitio (~200ms, `ease-out`) y respetar `prefers-reduced-motion` (cambio instantáneo).
- Manejar en cada vista los estados cargando, error y vacío.
- Alternar en textos, ejemplos e imágenes oficinas, negocios (salones, barberías, spas, consultorios) y espacios en casa.
- Marcar los datos pendientes (dirección y horario del showroom, WhatsApp, teléfono, email) como pendientes, no inventarlos.

**Don't**
- No usar el dorado fuera de lo relacionado con el showroom.
- No poner texto blanco pequeño sobre Azul Silla; para botones usar Azul Acción.
- No aplicar textura a varias muestras a la vez ni a otros elementos.
- No agregar sombras a tarjetas en reposo.
- No inventar tipos de espacio, testimonios, cifras ni colores de material.
- No escribir como si el sitio fuera solo para empresas (p. ej. "equipe su corporación"); el tono es profesional pero cercano para todos.
- No enlazar imágenes del CDN de Instagram.
