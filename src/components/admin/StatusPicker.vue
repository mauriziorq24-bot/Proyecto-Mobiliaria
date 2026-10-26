<script setup>
import { Check, LoaderCircle } from 'lucide-vue-next'
import { computed, useId } from 'vue'

// Botones grandes para cambiar el estado de una cotización o una cita (panel /admin).
// Son botones con aria-pressed y no radios: con radios, cada flecha del teclado cambiaría el
// estado y enviaría un PATCH. Aquí solo cambia al tocar o pulsar Enter/Espacio.
// El elegido se marca con forma (borde, fondo y check), no solo con color.
const props = defineProps({
  // ESTADOS_COTIZACION o ESTADOS_CITA de utils/formato.js
  estados: { type: Object, required: true },
  actual: { type: String, default: null },
  // Mientras el PATCH está en curso se dice "Guardando…": el cambio ya se ve, pero aún no está confirmado.
  guardando: { type: Boolean, default: false },
  legend: { type: String, default: 'Estado' },
})

const emit = defineEmits(['cambiar'])
const legendId = useId()
const opciones = computed(() => Object.entries(props.estados).map(([valor, estado]) => ({ valor, ...estado })))

// Rejilla según el ancho de la tarjeta (container query), no de la pantalla: el mismo detalle
// es angosto en el teléfono y ancho junto a la lista en escritorio.
// 4 opciones: siempre 2 × 2. 3 opciones: en una fila solo desde 24rem (384px); por debajo,
// "Contactado" con su check no cabe en un tercio, así que van 2 arriba y la tercera a lo ancho.
const rejilla = computed(() =>
  opciones.value.length === 3 ? 'grid-cols-2 [&>:last-child]:col-span-2 @sm:grid-cols-3 @sm:[&>:last-child]:col-span-1' : 'grid-cols-2',
)
</script>

<template>
  <div role="group" :aria-labelledby="legendId" class="@container">
    <div class="flex items-center justify-between gap-3">
      <p :id="legendId" class="text-label text-ink-muted uppercase">{{ legend }}</p>
      <p class="flex items-center gap-1.5 text-small text-ink-muted" aria-live="polite">
        <template v-if="guardando">
          <LoaderCircle class="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Guardando…
        </template>
      </p>
    </div>
    <div class="mt-2 grid gap-2" :class="rejilla">
      <button
        v-for="opcion in opciones"
        :key="opcion.valor"
        type="button"
        class="flex min-h-12 items-center justify-center gap-1.5 rounded-md border px-2 text-center font-semibold transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.97] [&>svg]:size-4 [&>svg]:shrink-0"
        :class="
          opcion.valor === actual
            ? 'border-brand-deep bg-brand-tint text-brand-deep'
            : 'border-line-strong bg-surface text-ink hover:bg-ground'
        "
        :aria-pressed="opcion.valor === actual"
        @click="emit('cambiar', opcion.valor)"
      >
        <Check v-if="opcion.valor === actual" aria-hidden="true" />
        {{ opcion.etiqueta }}
      </button>
    </div>
  </div>
</template>
