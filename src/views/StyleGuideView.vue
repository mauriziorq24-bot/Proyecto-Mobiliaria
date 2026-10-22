<script setup>
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Heart,
  Mail,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import logoUrl from '../assets/logo.png'
import BaseBadge from '../components/ui/BaseBadge.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseIconButton from '../components/ui/BaseIconButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import ProductCard from '../components/product/ProductCard.vue'
import ProductCardSkeleton from '../components/product/ProductCardSkeleton.vue'
import ProductGallery from '../components/product/ProductGallery.vue'
import ProductGrid from '../components/product/ProductGrid.vue'
import { productos as mockProductos } from '../mocks/productos'

const sections = [
  { id: 'colores', title: 'Colores' },
  { id: 'tipografia', title: 'Tipografía' },
  { id: 'formas', title: 'Radios y sombras' },
  { id: 'botones', title: 'Botones' },
  { id: 'botones-icono', title: 'Botones de ícono' },
  { id: 'campos', title: 'Campos de texto' },
  { id: 'etiquetas', title: 'Etiquetas' },
  { id: 'productos', title: 'Productos' },
]

const colorGroups = [
  {
    title: 'Marca',
    colors: [
      { name: 'Azul Silla', token: 'brand', hex: '#1F80E0', use: 'Header, foco, categoría activa' },
      { name: 'Azul Acción', token: 'brand-deep', hex: '#1566B8', use: 'Botones principales y enlaces' },
      { name: 'Azul Acción hover', token: 'brand-deeper', hex: '#12579F', use: 'Hover del botón principal' },
      { name: 'Tinte Azul', token: 'brand-tint', hex: '#E8F1FC', use: 'Filtros activos, seleccionados' },
    ],
  },
  {
    title: 'Showroom',
    colors: [
      { name: 'Dorado Showroom', token: 'showroom-gold', hex: '#E4A11B', use: 'Solo lo que lleva al showroom' },
      { name: 'Dorado hover', token: 'showroom-gold-deep', hex: '#CF8F10', use: 'Hover de "Agendar visita"' },
    ],
  },
  {
    title: 'Neutros',
    colors: [
      { name: 'Fondo Frío', token: 'ground', hex: '#F3F5F8', use: 'Fondo de página' },
      { name: 'Superficie', token: 'surface', hex: '#FFFFFF', use: 'Tarjetas, buscador, barras' },
      { name: 'Línea', token: 'line', hex: '#DCE2EA', use: 'Bordes y divisores de 1px' },
      { name: 'Tinta Suave', token: 'ink-muted', hex: '#5B6573', use: 'Metadatos, "Precio referencial"' },
      { name: 'Tinta', token: 'ink', hex: '#14171C', use: 'Títulos y texto' },
    ],
  },
  {
    title: 'Canales y estados',
    colors: [
      { name: 'WhatsApp', token: 'whatsapp', hex: '#0F7A43', use: 'Solo "Enviar por WhatsApp"' },
      { name: 'Éxito', token: 'success', hex: '#1E7F4F', use: 'Agregado, cita confirmada' },
      { name: 'Error', token: 'error', hex: '#C62F2F', use: 'Errores de formulario o carga' },
      { name: 'Aviso', token: 'warning', hex: '#9A5B00', use: 'Avisos' },
    ],
  },
  {
    title: 'Muestras por tipo de espacio',
    colors: [
      { name: 'Azul Acción', token: 'swatch-oficina', hex: '#1566B8', use: 'OFICINA' },
      { name: 'Madera', token: 'swatch-hogar', hex: '#8A6A4B', use: 'HOGAR' },
      { name: 'Malla Negra', token: 'swatch-salon-belleza', hex: '#2B2F36', use: 'SALON_BELLEZA' },
      { name: 'Gris Claro', token: 'swatch-consultorio', hex: '#C9CFD7', use: 'CONSULTORIO (texto Tinta)' },
      { name: 'Gris Oxford', token: 'swatch-fallback', hex: '#6E7783', use: 'Tipo nuevo sin color' },
    ],
  },
]

const priceFormatter = new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})

const typeScale = [
  { name: 'Display', className: 'text-display', spec: '800 · 28 → 36px · 1.2', sample: 'Equipa tu oficina completa' },
  { name: 'Headline', className: 'text-headline', spec: '700 · 24 → 30px · 1.22', sample: 'Silla Ejecutiva Malla Transpirable' },
  { name: 'Title', className: 'text-title', spec: '700 · 20 → 24px · 1.28', sample: 'Sillería Ergonómica' },
  { name: 'Card title', className: 'text-card-title', spec: '600 · 16px · 1.35', sample: 'Escritorio Bench Operativo para 4 puestos' },
  {
    name: 'Body',
    className: 'text-body max-w-[70ch]',
    spec: '400 · 16px · 1.5',
    sample: 'Respaldo en malla transpirable, soporte lumbar regulable y base de aluminio con rodachinas. Puedes probarla en nuestro showroom antes de pedir tu cotización.',
  },
  { name: 'Small', className: 'text-small text-ink-muted', spec: '500 · 13 → 14px · 1.4', sample: 'Precio referencial · 0.65m x 0.65m x 1.20m' },
  { name: 'Label', className: 'text-label uppercase', spec: '700 · 11px · +0.12em · mayúsculas', sample: 'Tipo de espacio' },
  { name: 'Price', className: 'text-price tabular-nums', spec: '700 · 16px · cifras tabulares', sample: priceFormatter.format(120) },
  { name: 'Price large', className: 'text-price-large tabular-nums', spec: '800 · 28px · cifras tabulares', sample: priceFormatter.format(1480) },
]

const radii = [
  { name: 'sm · 6px', className: 'rounded-sm', use: 'Chips y etiquetas' },
  { name: 'md · 10px', className: 'rounded-md', use: 'Botones, campos, tarjetas' },
  { name: 'lg · 16px', className: 'rounded-lg', use: 'Drawer y modales' },
  { name: 'full', className: 'rounded-full', use: 'Contadores' },
]

const buttonVariants = [
  { variant: 'primary', label: 'Solicitar cotización', note: 'Acción principal' },
  { variant: 'secondary', label: 'Ver detalles', note: 'Acción de apoyo' },
  { variant: 'ghost', label: 'Seguir viendo', note: 'Acción discreta' },
  { variant: 'visit', label: 'Agendar visita', note: 'Solo showroom' },
  { variant: 'whatsapp', label: 'Enviar por WhatsApp', note: 'Solo WhatsApp' },
]
const sizes = ['sm', 'md', 'lg']

// Demo de emits: BaseButton emite "click" y aquí reaccionamos simulando un envío.
const isSending = ref(false)
const sentCount = ref(0)
function simulateQuote() {
  isSending.value = true
  setTimeout(() => {
    isSending.value = false
    sentCount.value++
  }, 1600)
}

// Demo de v-model: BaseInput emite "update:modelValue" y v-model actualiza estas variables.
const fullName = ref('')
const nameTouched = ref(false)
const nameError = computed(() =>
  nameTouched.value && fullName.value.trim() === '' ? 'Escribe tu nombre para enviar la cotización.' : '',
)
const email = ref('')
const searchQuery = ref('')

const favoritesCount = ref(2)

// Demo de productos: casos límite armados a partir de los mocks.
const [baseProduct] = mockProductos
const cardCases = [
  { note: 'En showroom', producto: baseProduct },
  {
    note: 'Nombre largo, sin showroom',
    producto: {
      ...baseProduct,
      id: 901,
      nombre: 'Silla Ergonómica Ejecutiva con Cabezal Ajustable, Soporte Lumbar y Brazos 4D',
      categoriaNombre: 'Sillería',
      enShowroom: false,
      precioReferencialUsd: 1250,
    },
  },
  {
    note: 'La foto falla al cargar',
    producto: { ...baseProduct, id: 902, imagenes: ['/no-existe.jpg'], precioReferencialUsd: 99.5 },
  },
  {
    note: 'Sin fotos ni precio',
    producto: { ...baseProduct, id: 903, imagenes: [], precioReferencialUsd: null, enShowroom: false },
  },
]


// Demo de ProductGrid: los tres estados con un selector.
const gridStates = [
  { value: 'loaded', label: 'Con productos' },
  { value: 'loading', label: 'Cargando' },
  { value: 'empty', label: 'Vacío' },
]
const gridState = ref('loaded')
const gridProducts = computed(() => (gridState.value === 'empty' ? [] : mockProductos.slice(0, 8)))

// Demo de ProductGallery. Las fotos reales aún no están en el repo, así que se usan
// imágenes de prueba numeradas (SVG en línea) para ver claramente el cambio de foto.
function demoPhoto(number, background) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="${background}"/><text x="300" y="300" font-family="Figtree, sans-serif" font-size="56" font-weight="700" fill="#5B6573" text-anchor="middle" dominant-baseline="middle">Foto ${number}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
const demoPhotos = [
  demoPhoto(1, '#F3F5F8'),
  demoPhoto(2, '#E8F1FC'),
  demoPhoto(3, '#EFE9E3'),
  demoPhoto(4, '#E9ECF0'),
]
const galleryCases = [
  { note: 'Sin fotos: placeholder', imagenes: [] },
  { note: 'Una foto: sin miniaturas ni puntos', imagenes: [demoPhotos[0]] },
  { note: 'Cuatro fotos', imagenes: demoPhotos },
  { note: 'Cuatro fotos, la tercera falla', imagenes: [demoPhotos[0], demoPhotos[1], '/no-existe.jpg', demoPhotos[3]] },
]
</script>

<template>
  <div class="min-h-screen pb-16">
    <!-- Franja azul de marca: el mismo compromiso de color que tendrá el header -->
    <header class="bg-brand text-white">
      <div class="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-5 md:px-6 lg:px-8">
        <img :src="logoUrl" alt="" class="size-10 rounded-md" />
        <!-- Sobre Azul Silla solo va texto blanco ≥19px en negrita (contraste ~4:1) -->
        <h1 class="text-xl leading-tight font-extrabold">Guía de estilo</h1>
      </div>
    </header>

    <!-- Índice en móvil: chips con scroll horizontal -->
    <nav
      aria-label="Secciones de la guía"
      class="sticky top-0 z-10 border-b border-line bg-surface lg:hidden"
    >
      <ul class="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:px-6">
        <li v-for="section in sections" :key="section.id" class="shrink-0">
          <a
            :href="`#${section.id}`"
            class="block rounded-sm px-3 py-2 text-small text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand-deep"
          >
            {{ section.title }}
          </a>
        </li>
      </ul>
    </nav>

    <div class="mx-auto flex max-w-[1280px] gap-12 px-4 md:px-6 lg:px-8">
      <!-- Índice en escritorio: columna fija a la izquierda -->
      <nav aria-label="Secciones de la guía" class="hidden w-48 shrink-0 lg:block">
        <ul class="sticky top-0 flex flex-col gap-0.5 py-12">
          <li v-for="section in sections" :key="section.id">
            <a
              :href="`#${section.id}`"
              class="block rounded-sm px-3 py-2 text-small text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand-deep"
            >
              {{ section.title }}
            </a>
          </li>
        </ul>
      </nav>

      <main class="min-w-0 flex-1">
        <!-- COLORES -->
        <section id="colores" class="scroll-mt-16 pt-12">
          <h2 class="text-headline">Colores</h2>
          <p class="mt-2 max-w-[65ch] text-ink-muted">
            Azul de marca comprometido sobre neutros fríos. El dorado significa "showroom": si no lleva a ver
            los muebles en persona, no es dorado.
          </p>

          <div v-for="group in colorGroups" :key="group.title" class="mt-10">
            <h3 class="text-title">{{ group.title }}</h3>
            <ul class="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 xl:grid-cols-5">
              <li v-for="color in group.colors" :key="color.token">
                <div
                  class="h-20 rounded-md border border-ink/10"
                  :style="{ backgroundColor: `var(--color-${color.token})` }"
                />
                <p class="mt-2.5 text-card-title">{{ color.name }}</p>
                <p class="mt-0.5 font-mono text-xs text-ink-muted">
                  {{ color.token }} · {{ color.hex }}
                </p>
                <p class="mt-1 text-small text-ink-muted">{{ color.use }}</p>
              </li>
            </ul>
          </div>
        </section>

        <!-- TIPOGRAFÍA -->
        <section id="tipografia" class="scroll-mt-16 pt-20">
          <h2 class="text-headline">Tipografía</h2>
          <p class="mt-2 max-w-[65ch] text-ink-muted">
            Una sola fuente, Figtree. La escala es corta: la jerarquía se gana con peso y mayúsculas, no con
            tamaños nuevos.
          </p>

          <dl class="mt-8 divide-y divide-line border-y border-line">
            <div
              v-for="level in typeScale"
              :key="level.name"
              class="grid gap-2 py-5 md:grid-cols-[11rem_1fr] md:items-baseline md:gap-8"
            >
              <dt>
                <span class="text-small font-semibold text-ink">{{ level.name }}</span>
                <span class="block font-mono text-xs text-ink-muted">{{ level.className.split(' ')[0] }}</span>
                <span class="block text-xs text-ink-muted">{{ level.spec }}</span>
              </dt>
              <dd :class="level.className" class="text-pretty">{{ level.sample }}</dd>
            </div>
          </dl>
        </section>

        <!-- RADIOS Y SOMBRAS -->
        <section id="formas" class="scroll-mt-16 pt-20">
          <h2 class="text-headline">Radios y sombras</h2>
          <p class="mt-2 max-w-[65ch] text-ink-muted">
            Superficies planas con borde de 1px. Las sombras aparecen solo en lo que flota sobre el contenido.
          </p>

          <ul class="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <li v-for="radius in radii" :key="radius.name">
              <div class="h-20 border border-brand-deep bg-brand-tint" :class="radius.className" />
              <p class="mt-2.5 text-card-title">{{ radius.name }}</p>
              <p class="text-small text-ink-muted">{{ radius.use }}</p>
            </li>
          </ul>

          <ul class="mt-10 grid gap-6 md:grid-cols-3">
            <li>
              <div class="flex h-24 items-center justify-center rounded-md border border-line bg-surface text-small text-ink-muted">
                En reposo
              </div>
              <p class="mt-2.5 text-card-title">Sin sombra</p>
              <p class="text-small text-ink-muted">Tarjetas y superficies quietas</p>
            </li>
            <li>
              <div class="flex h-24 items-center justify-center rounded-md bg-surface text-small text-ink-muted shadow-sm">
                shadow-sm
              </div>
              <p class="mt-2.5 text-card-title">Sombra sm</p>
              <p class="text-small text-ink-muted">Header fijo al hacer scroll</p>
            </li>
            <li>
              <div class="flex h-24 items-center justify-center rounded-md bg-surface text-small text-ink-muted shadow-lg">
                shadow-lg
              </div>
              <p class="mt-2.5 text-card-title">Sombra lg</p>
              <p class="text-small text-ink-muted">Menús, drawer, barra de cotización</p>
            </li>
          </ul>
        </section>

        <!-- BOTONES -->
        <section id="botones" class="scroll-mt-16 pt-20">
          <h2 class="text-headline">Botones</h2>
          <p class="mt-2 max-w-[65ch] text-ink-muted">
            Cinco variantes con un trabajo cada una y tres tamaños. Altura mínima táctil de 44px; el tamaño
            <code class="font-mono text-sm text-ink">sm</code> amplía su área de toque sin crecer a la vista.
          </p>

          <div class="mt-8 overflow-x-auto rounded-md border border-line bg-surface">
            <table class="w-full min-w-[640px] text-left">
              <thead>
                <tr class="border-b border-line">
                  <th scope="col" class="px-5 py-3 text-small font-semibold text-ink-muted">Variante</th>
                  <th v-for="size in sizes" :key="size" scope="col" class="px-5 py-3 font-mono text-xs font-normal text-ink-muted">
                    size="{{ size }}"
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="item in buttonVariants" :key="item.variant">
                  <th scope="row" class="px-5 py-4 align-middle font-normal">
                    <span class="block font-mono text-xs text-ink">{{ item.variant }}</span>
                    <span class="block text-small text-ink-muted">{{ item.note }}</span>
                  </th>
                  <td v-for="size in sizes" :key="size" class="px-5 py-4">
                    <BaseButton :variant="item.variant" :size="size">{{ item.label }}</BaseButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="mt-12 text-title">Con íconos</h3>
          <div class="mt-4 flex flex-wrap gap-3">
            <BaseButton variant="visit">
              <template #icon-left><CalendarDays /></template>
              Agendar visita
            </BaseButton>
            <BaseButton variant="whatsapp">
              <template #icon-left><MessageCircle /></template>
              Enviar por WhatsApp
            </BaseButton>
            <BaseButton>
              <template #icon-left><Plus /></template>
              Agregar a la cotización
            </BaseButton>
            <BaseButton variant="secondary">
              Ver catálogo
              <template #icon-right><ArrowRight /></template>
            </BaseButton>
            <BaseButton variant="ghost" size="sm">
              <template #icon-left><Trash2 /></template>
              Quitar
            </BaseButton>
          </div>

          <h3 class="mt-12 text-title">Estados</h3>
          <div class="mt-4 grid gap-6 md:grid-cols-3">
            <div>
              <BaseButton :loading="isSending" @click="simulateQuote">Solicitar cotización</BaseButton>
              <p class="mt-2 text-small text-ink-muted">
                Pulsa para ver <code class="font-mono text-xs text-ink">loading</code>.
                <span v-if="sentCount" class="tabular-nums">Enviadas: {{ sentCount }}</span>
              </p>
            </div>
            <div>
              <BaseButton disabled>Solicitar cotización</BaseButton>
              <p class="mt-2 text-small text-ink-muted"><code class="font-mono text-xs text-ink">disabled</code></p>
            </div>
            <div>
              <BaseButton variant="secondary" loading>Guardando</BaseButton>
              <p class="mt-2 text-small text-ink-muted">loading en secundario</p>
            </div>
          </div>

          <h3 class="mt-12 text-title">Ancho completo</h3>
          <div class="mt-4 flex max-w-sm flex-col gap-3">
            <BaseButton block>Solicitar cotización</BaseButton>
            <BaseButton variant="whatsapp" block>
              <template #icon-left><MessageCircle /></template>
              Enviar por WhatsApp
            </BaseButton>
          </div>

          <pre class="mt-6 overflow-x-auto rounded-md bg-ink px-4 py-3 font-mono text-[13px] leading-relaxed text-white/90"><code>&lt;BaseButton variant="visit" size="md" :loading="enviando" @click="agendar"&gt;
  &lt;template #icon-left&gt;&lt;CalendarDays /&gt;&lt;/template&gt;
  Agendar visita
&lt;/BaseButton&gt;</code></pre>
        </section>

        <!-- BOTONES DE ÍCONO -->
        <section id="botones-icono" class="scroll-mt-16 pt-20">
          <h2 class="text-headline">Botones de ícono</h2>
          <p class="mt-2 max-w-[65ch] text-ink-muted">
            Para acciones que se reconocen por el ícono. Siempre llevan <code class="font-mono text-sm text-ink">label</code>:
            no se ve, pero el lector de pantalla lo anuncia.
          </p>

          <div class="mt-8 overflow-x-auto rounded-md border border-line bg-surface">
            <table class="w-full min-w-[480px] text-left">
              <thead>
                <tr class="border-b border-line">
                  <th scope="col" class="px-5 py-3 text-small font-semibold text-ink-muted">Variante</th>
                  <th v-for="size in sizes" :key="size" scope="col" class="px-5 py-3 font-mono text-xs font-normal text-ink-muted">
                    size="{{ size }}"
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="variant in ['ghost', 'secondary', 'primary']" :key="variant">
                  <th scope="row" class="px-5 py-4 font-mono text-xs font-normal text-ink">{{ variant }}</th>
                  <td v-for="size in sizes" :key="size" class="px-5 py-4">
                    <BaseIconButton :icon="Heart" label="Agregar a favoritos" :variant="variant" :size="size" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="mt-12 text-title">Sobre el header azul, con contador</h3>
          <div class="mt-4 flex items-center justify-between gap-2 rounded-md bg-brand px-3 py-3">
            <BaseIconButton :icon="Menu" label="Abrir menú" variant="inverse" />
            <div class="flex items-center gap-1">
              <BaseIconButton :icon="User" label="Mi cuenta" variant="inverse" />
              <BaseIconButton
                :icon="Heart"
                label="Ver favoritos"
                variant="inverse"
                :badge="favoritesCount"
                @click="favoritesCount++"
              />
              <BaseIconButton :icon="ShoppingCart" label="Ver cotización" variant="inverse" :badge="128" />
            </div>
          </div>
          <p class="mt-2 text-small text-ink-muted">
            Pulsa el corazón: el padre escucha <code class="font-mono text-xs text-ink">@click</code> y sube el contador.
            Por encima de 99 se muestra "99+".
          </p>

          <div class="mt-6 flex items-center gap-3">
            <BaseIconButton :icon="Trash2" label="Quitar de la cotización" variant="secondary" disabled />
            <p class="text-small text-ink-muted"><code class="font-mono text-xs text-ink">disabled</code></p>
          </div>
        </section>

        <!-- CAMPOS -->
        <section id="campos" class="scroll-mt-16 pt-20">
          <h2 class="text-headline">Campos de texto</h2>
          <p class="mt-2 max-w-[65ch] text-ink-muted">
            Etiqueta siempre visible, 46px de alto y texto de 16px para que iOS no haga zoom. El error dice
            qué pasó y cómo resolverlo.
          </p>

          <div class="mt-8 grid max-w-3xl gap-x-6 gap-y-7 rounded-md border border-line bg-surface p-5 md:grid-cols-2 md:p-6">
            <BaseInput
              v-model="fullName"
              label="Nombre y apellido"
              placeholder="María Pérez"
              autocomplete="name"
              required
              :error="nameError"
              hint="Déjalo vacío y sal del campo para ver el error."
              @blur="nameTouched = true"
            />
            <BaseInput
              v-model="email"
              type="email"
              label="Correo electrónico"
              placeholder="compras@tuempresa.com"
              autocomplete="email"
              hint="Te enviaremos la cotización a este correo."
            >
              <template #leading><Mail /></template>
            </BaseInput>
            <BaseInput
              model-value="0412-123"
              type="tel"
              label="Teléfono"
              error="El número está incompleto. Usa el formato 0412-1234567."
            />
            <BaseInput model-value="Mobiliario de Oficina" label="Empresa" disabled />
            <div class="md:col-span-2">
              <BaseInput
                v-model="searchQuery"
                type="search"
                label="Buscar"
                placeholder="Buscar sillas, escritorios, mesas…"
              >
                <template #leading><Search /></template>
              </BaseInput>
            </div>
          </div>

          <p class="mt-3 text-small text-ink-muted">
            v-model en vivo →
            nombre: <span class="text-ink">"{{ fullName }}"</span> ·
            correo: <span class="text-ink">"{{ email }}"</span> ·
            búsqueda: <span class="text-ink">"{{ searchQuery }}"</span>
          </p>
        </section>

        <!-- ETIQUETAS -->
        <section id="etiquetas" class="scroll-mt-16 pt-20">
          <h2 class="text-headline">Etiquetas</h2>
          <p class="mt-2 max-w-[65ch] text-ink-muted">
            Ningún estado depende solo del color: cada etiqueta lleva texto o un número.
          </p>

          <div class="mt-8 grid gap-8 md:grid-cols-3">
            <div>
              <h3 class="text-card-title">Producto</h3>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <BaseBadge variant="showroom">En showroom</BaseBadge>
                <BaseBadge variant="material">Malla y aluminio</BaseBadge>
              </div>
            </div>
            <div>
              <h3 class="text-card-title">Contadores</h3>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <BaseBadge variant="count" :count="3" />
                <BaseBadge variant="count" :count="12" />
                <BaseBadge variant="count" :count="150" />
              </div>
            </div>
            <div class="md:col-span-3">
              <h3 class="text-card-title">Estados</h3>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <BaseBadge variant="success"><Check />Agregado a tu cotización</BaseBadge>
                <BaseBadge variant="info">3 productos en tu lista</BaseBadge>
                <BaseBadge variant="warning"><CircleAlert />Horario del showroom pendiente</BaseBadge>
                <BaseBadge variant="error"><CircleAlert />No se pudo cargar el catálogo</BaseBadge>
              </div>
            </div>
          </div>
        </section>

        <!-- PRODUCTOS -->
        <section id="productos" class="scroll-mt-16 pt-20">
          <h2 class="text-headline">Productos</h2>
          <p class="mt-2 max-w-[65ch] text-ink-muted">
            La tarjeta entera lleva a la ficha del producto. Pasa el cursor para ver el hover y prueba el
            corazón: guarda de verdad en tus favoritos (y suma en el contador del header).
          </p>

          <h3 class="mt-8 text-title">Tarjeta</h3>
          <ul class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6">
            <li v-for="item in cardCases" :key="item.producto.id" class="flex flex-col gap-2">
              <span class="text-small text-ink-muted">{{ item.note }}</span>
              <ProductCard :producto="item.producto" class="flex-1" />
            </li>
          </ul>

          <h3 class="mt-12 text-title">Tarjeta cargando</h3>
          <p class="mt-1 text-small text-ink-muted">
            Misma forma que la tarjeta, para que nada salte al llegar los datos.
          </p>
          <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6">
            <ProductCard :producto="baseProduct" />
            <ProductCardSkeleton />
          </div>

          <h3 class="mt-12 text-title">Grilla</h3>
          <p class="mt-1 text-small text-ink-muted">2 columnas en móvil, 3 en tablet y 4 en escritorio.</p>
          <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Estado de la grilla">
            <button
              v-for="state in gridStates"
              :key="state.value"
              type="button"
              :aria-pressed="gridState === state.value"
              class="rounded-sm border px-3 py-1.5 text-small transition-colors"
              :class="
                gridState === state.value
                  ? 'border-brand-deep bg-brand-tint text-brand-deep'
                  : 'border-line bg-surface text-ink-muted hover:text-ink'
              "
              @click="gridState = state.value"
            >
              {{ state.label }}
            </button>
          </div>
          <div class="mt-4">
            <ProductGrid
              :productos="gridProducts"
              :loading="gridState === 'loading'"
            >
              <template #empty>
                <p class="text-card-title">No hay productos en showroom con ese filtro</p>
                <p class="mt-1 text-small text-ink-muted">
                  Ejemplo del slot <code>#empty</code>: cada vista escribe su propio mensaje.
                </p>
              </template>
            </ProductGrid>
          </div>

          <h3 class="mt-12 text-title">Galería</h3>
          <p class="mt-1 max-w-[65ch] text-small text-ink-muted">
            En el teléfono se desliza con el dedo; desde tablet, con las miniaturas. Con el foco en la foto
            (tecla Tab), las flechas ← → cambian de foto. Las fotos numeradas son de prueba.
          </p>
          <ul class="mt-4 grid gap-8 md:grid-cols-2 lg:gap-12">
            <li v-for="item in galleryCases" :key="item.note" class="flex flex-col gap-2">
              <span class="text-small text-ink-muted">{{ item.note }}</span>
              <ProductGallery :imagenes="item.imagenes" :nombre="baseProduct.nombre" class="max-w-[480px]" />
            </li>
          </ul>
        </section>
      </main>
    </div>
  </div>
</template>
