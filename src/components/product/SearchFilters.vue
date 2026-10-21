<script setup>
import { Check } from 'lucide-vue-next'
import { computed, useId } from 'vue'
import { TIPOS_ESPACIO } from '../../config/tiposEspacio'
import PriceRangeFields from './PriceRangeFields.vue'

// Los grupos de filtros de /buscar (DESIGN.md › Página de búsqueda), en este orden:
// Categoría, Ambiente, Solo en showroom y Precio referencial.
// No guarda estado propio: muestra `filtros` y avisa con `change` qué cambió.
// Se usa dos veces: en la barra lateral de escritorio (filtros reales, se aplican al momento)
// y en el panel móvil (filtros del borrador).
const props = defineProps({
  // { categoria, tipoEspacio, enShowroom, precioMin, precioMax }
  filtros: { type: Object, required: true },
  categorias: { type: Array, default: () => [] },
  // Resultado de contarOpciones(); null mientras carga el catálogo (los conteos esperan).
  conteos: { type: Object, default: null },
  // Mínimo y máximo del catálogo, para los placeholders del precio.
  rangoPrecio: { type: Object, default: () => ({ min: null, max: null }) },
  priceDebounce: { type: Number, default: 0 },
})

// change: los filtros que cambian, p. ej. { tipoEspacio: 'HOGAR' }
// price: { precioMin, precioMax, valid } tal como lo emite PriceRangeFields
const emit = defineEmits(['change', 'price'])

// Dos instancias en la misma página: cada una necesita nombres e ids propios para sus radios.
const id = useId()

const countFormat = new Intl.NumberFormat('es-VE')

// Una opción por grupo: "Todas" + una por categoría de la API.
const opcionesCategoria = computed(() => [
  { valor: null, etiqueta: 'Todas', conteo: props.conteos?.sinFiltro.categoria },
  ...props.categorias.map((c) => ({ valor: c.slug, etiqueta: c.nombre, conteo: props.conteos?.categorias[c.slug] })),
])

const opcionesAmbiente = computed(() => [
  { valor: null, etiqueta: 'Todos', conteo: props.conteos?.sinFiltro.tipoEspacio },
  ...TIPOS_ESPACIO.map((tipo) => ({ ...tipo, conteo: props.conteos?.tiposEspacio[tipo.valor] })),
])

const grupos = computed(() => [
  { clave: 'categoria', titulo: 'Categoría', opciones: opcionesCategoria.value },
  { clave: 'tipoEspacio', titulo: 'Ambiente', opciones: opcionesAmbiente.value },
])

// Una opción sin productos (con los demás filtros) no se puede elegir, salvo que ya esté elegida:
// así siempre se puede volver atrás.
function sinProductos(opcion, elegida) {
  return opcion.conteo === 0 && !elegida
}

const conteoShowroom = computed(() => props.conteos?.enShowroom)
const showroomDisabled = computed(() => conteoShowroom.value === 0 && !props.filtros.enShowroom)

const optionRow = [
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors duration-200 ease-out',
  // El radio está oculto: el anillo de foco se dibuja en la fila.
  'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand',
]
</script>

<template>
  <div class="flex flex-col gap-7">
    <fieldset v-for="grupo in grupos" :key="grupo.clave">
      <legend class="mb-2 text-label text-ink-muted uppercase">{{ grupo.titulo }}</legend>
      <ul class="flex flex-col gap-1">
        <li v-for="opcion in grupo.opciones" :key="opcion.valor ?? 'todas'">
          <label
            :class="[
              optionRow,
              filtros[grupo.clave] === opcion.valor
                ? 'border-brand-deep bg-brand-tint text-brand-deep'
                : 'border-transparent text-ink hover:bg-ground',
              sinProductos(opcion, filtros[grupo.clave] === opcion.valor) && 'cursor-not-allowed opacity-45 hover:bg-transparent',
            ]"
          >
            <input
              type="radio"
              class="sr-only"
              :name="`${id}-${grupo.clave}`"
              :checked="filtros[grupo.clave] === opcion.valor"
              :disabled="sinProductos(opcion, filtros[grupo.clave] === opcion.valor)"
              @change="emit('change', { [grupo.clave]: opcion.valor })"
            />
            <!-- Ambiente: el ícono sobre el color de su muestra, en miniatura -->
            <span
              v-if="opcion.icon"
              class="grid size-6 shrink-0 place-items-center rounded-sm"
              :class="opcion.swatchClass"
              aria-hidden="true"
            >
              <component :is="opcion.icon" class="size-3.5" :stroke-width="2" />
            </span>
            <span class="min-w-0 flex-1 font-semibold">{{ opcion.etiqueta }}</span>
            <span v-if="opcion.conteo != null" class="text-small text-ink-muted tabular-nums">
              ({{ countFormat.format(opcion.conteo) }})
            </span>
            <!-- La opción elegida lleva un check: el estado no depende solo del color -->
            <Check
              class="size-4 shrink-0"
              :class="filtros[grupo.clave] === opcion.valor ? 'text-brand-deep' : 'invisible'"
              :stroke-width="2.5"
              aria-hidden="true"
            />
          </label>
        </li>
      </ul>
    </fieldset>

    <!-- Solo en showroom: interruptor. El punto dorado es lo único dorado de la página. -->
    <div>
      <button
        type="button"
        role="switch"
        :aria-checked="filtros.enShowroom"
        :disabled="showroomDisabled"
        class="flex min-h-11 w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-45"
        :class="
          filtros.enShowroom
            ? 'border-brand-deep bg-brand-tint text-brand-deep'
            : 'border-line text-ink enabled:hover:bg-ground'
        "
        @click="emit('change', { enShowroom: !filtros.enShowroom })"
      >
        <span class="size-2.5 shrink-0 rounded-full bg-showroom-gold" aria-hidden="true" />
        <span class="min-w-0 flex-1 font-semibold whitespace-nowrap">Solo en showroom</span>
        <span v-if="conteoShowroom != null" class="text-small text-ink-muted tabular-nums">
          ({{ countFormat.format(conteoShowroom) }})
        </span>
        <span
          class="relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ease-out"
          :class="filtros.enShowroom ? 'bg-brand-deep' : 'bg-line'"
          aria-hidden="true"
        >
          <span
            class="absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-out"
            :class="filtros.enShowroom && 'translate-x-4'"
          />
        </span>
      </button>
    </div>

    <fieldset>
      <legend class="mb-3 text-label text-ink-muted uppercase">Precio referencial (USD)</legend>
      <PriceRangeFields
        :min="filtros.precioMin"
        :max="filtros.precioMax"
        :placeholder-min="rangoPrecio.min"
        :placeholder-max="rangoPrecio.max"
        :debounce="priceDebounce"
        @update="emit('price', $event)"
      />
    </fieldset>
  </div>
</template>
