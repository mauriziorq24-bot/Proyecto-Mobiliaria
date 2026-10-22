<script setup>
import { CircleOff, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CANTIDAD_MAXIMA, CANTIDAD_MINIMA } from '../../stores/cotizacion'
import { formatearPrecio } from '../../utils/formato'
import BaseButton from '../ui/BaseButton.vue'
import BaseQuantityInput from '../ui/BaseQuantityInput.vue'

const PLACEHOLDER = '/placeholder-producto.svg'

// Una línea de la página Mi cotización. `item` es el del store: { productoId, cantidad, producto, disponible },
// donde `producto` es la copia guardada ({ nombre, precioReferencialUsd, imagen, categoriaNombre }).
const props = defineProps({
  item: { type: Object, required: true },
})

// update:cantidad → el padre llama a cotizacion.cambiarCantidad · remove → cotizacion.quitar
const emit = defineEmits(['update:cantidad', 'remove'])

const producto = computed(() => props.item.producto)
const productLink = computed(() => ({ name: 'product', params: { id: props.item.productoId } }))
const subtotal = computed(() => props.item.cantidad * producto.value.precioReferencialUsd)

// Si la foto falla al cargar, se cambia por el placeholder (sin insistir si el que falla es el placeholder).
const imageFailed = ref(false)
const imageSrc = computed(() => (producto.value.imagen && !imageFailed.value ? producto.value.imagen : PLACEHOLDER))
function onImageError() {
  if (imageSrc.value !== PLACEHOLDER) imageFailed.value = true
}
</script>

<template>
  <!--
    Grilla de dos columnas: foto | datos. En móvil la fila de cantidad y "Quitar" va debajo y ocupa
    todo el ancho; desde sm queda en la columna de los datos, abajo. Así, con letra grande, ni el
    nombre ni el selector se quedan sin espacio.
  -->
  <li class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 py-4 sm:gap-x-5 sm:py-5">
    <!--
      La foto también lleva al producto, pero fuera del orden del teclado y oculta a lectores de
      pantalla: el nombre ya es ese enlace, y dos enlaces seguidos al mismo lugar solo estorban.
      Ancho en px, no en rem: si la persona agranda la letra, el espacio extra va al texto.
    -->
    <component
      :is="item.disponible ? RouterLink : 'div'"
      v-bind="item.disponible ? { to: productLink, tabindex: -1, 'aria-hidden': 'true' } : {}"
      class="block w-[80px] self-start overflow-hidden rounded-sm border border-line bg-ground sm:row-span-2 sm:w-[96px]"
    >
      <img
        :src="imageSrc"
        alt=""
        width="1080"
        height="1350"
        loading="lazy"
        decoding="async"
        class="aspect-[4/5] size-full object-cover object-center"
        :class="!item.disponible && 'opacity-50 grayscale'"
        @error="onImageError"
      />
    </component>

    <!-- basis-36: si no quedan ~9rem para el nombre junto al subtotal, el subtotal baja a otra línea -->
    <div class="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
      <div class="min-w-0 flex-1 basis-36">
        <p v-if="producto.categoriaNombre" class="truncate text-small text-ink-muted">
          {{ producto.categoriaNombre }}
        </p>
        <!-- tabindex -1: al deshacer un "Quitar", el foco vuelve aquí -->
        <h3 :id="`linea-${item.productoId}`" tabindex="-1" class="rounded-sm text-card-title">
          <RouterLink
            v-if="item.disponible"
            :to="productLink"
            class="line-clamp-2 text-ink hover:text-brand-deep hover:underline"
          >
            {{ producto.nombre }}
          </RouterLink>
          <span v-else class="line-clamp-2 text-ink-muted">{{ producto.nombre }}</span>
        </h3>

        <p v-if="item.disponible" class="mt-1 text-small text-ink-muted">
          Precio referencial
          <span class="whitespace-nowrap tabular-nums">{{ formatearPrecio(producto.precioReferencialUsd) }} c/u</span>
        </p>
        <!-- No disponible: lo dice el texto, no solo lo atenuado (regla del estado por forma) -->
        <template v-else>
          <p class="mt-1.5 inline-flex items-center gap-1.5 text-small font-semibold text-warning">
            <CircleOff class="size-4 shrink-0" aria-hidden="true" />
            Ya no está disponible
          </p>
          <p class="mt-0.5 text-small text-ink-muted">Salió del catálogo, así que no suma al total.</p>
        </template>
      </div>

      <!-- Subtotal de la línea: lo que suma al total referencial -->
      <p v-if="item.disponible" class="ml-auto shrink-0 text-right text-price text-ink tabular-nums">
        <span class="sr-only">Subtotal referencial: </span>{{ formatearPrecio(subtotal) }}
      </p>
    </div>

    <div class="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:col-span-1 sm:col-start-2 sm:self-end">
      <BaseQuantityInput
        v-if="item.disponible"
        :model-value="item.cantidad"
        :min="CANTIDAD_MINIMA"
        :max="CANTIDAD_MAXIMA"
        :label="`Cantidad de ${producto.nombre}`"
        @update:model-value="emit('update:cantidad', $event)"
      />
      <BaseButton
        :variant="item.disponible ? 'ghost' : 'secondary'"
        size="sm"
        class="ml-auto"
        :aria-label="`Quitar ${producto.nombre} de tu cotización`"
        @click="emit('remove')"
      >
        <template #icon-left><Trash2 /></template>
        Quitar
      </BaseButton>
    </div>
  </li>
</template>
