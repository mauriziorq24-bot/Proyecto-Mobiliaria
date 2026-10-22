<script setup>
import { Check, CircleCheck, Copy, MessageCircle } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import { buscarCotizacionReciente } from '../utils/cotizacionesEnviadas'
import { formatearPrecio } from '../utils/formato'
import { cotizacionEnviadaUrl } from '../utils/whatsapp'

// Confirmación de una solicitud de cotización recién enviada (DESIGN.md › Mi cotización › Confirmación).
// Lee la copia guardada en este navegador (src/utils/cotizacionesEnviadas.js): recargar la página
// no reenvía nada. El guard de la ruta ya revisó que exista; si no, llevó a /carrito.

const route = useRoute()

const cotizacion = computed(() => buscarCotizacionReciente(route.query.codigo))
const whatsappLink = computed(() => cotizacionEnviadaUrl(cotizacion.value.codigoCotizacion))
const unidades = computed(() => cotizacion.value.items.reduce((total, item) => total + item.cantidad, 0))

// --- Copiar el código (igual que en la confirmación de citas) ---
// copyState: '' (nada), 'copiado' o 'seleccionado' (el portapapeles falló: el código queda
// seleccionado para copiarlo a mano). copyMessage lo anuncia la región role="status".
const copyState = ref('')
const codeEl = useTemplateRef('code')
let copyTimer = null

const copyMessage = computed(() => {
  if (copyState.value === 'copiado') return 'Código copiado.'
  if (copyState.value === 'seleccionado') return 'No pudimos copiarlo. El código quedó seleccionado: cópialo desde tu teléfono o con Ctrl+C.'
  return ''
})

async function copyCode() {
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(cotizacion.value.codigoCotizacion)
    copyState.value = 'copiado'
    copyTimer = setTimeout(() => (copyState.value = ''), 2500)
  } catch {
    // Sin permiso o sin portapapeles (http, navegador viejo): se selecciona el código.
    const range = document.createRange()
    range.selectNodeContents(codeEl.value)
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    copyState.value = 'seleccionado'
  }
}

// El foco empieza en el título: un lector de pantalla anuncia de inmediato que la solicitud llegó.
const heading = useTemplateRef('heading')
onMounted(() => heading.value?.focus())
onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <div v-if="cotizacion" class="mx-auto w-full max-w-xl px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
    <section aria-labelledby="cot-ok-title" class="sm:rounded-md sm:border sm:border-line sm:bg-surface sm:p-8">
      <span class="inline-flex size-12 items-center justify-center rounded-full bg-success-bg text-success">
        <CircleCheck class="size-6" aria-hidden="true" />
      </span>
      <h1 id="cot-ok-title" ref="heading" tabindex="-1" class="mt-4 text-headline text-balance text-ink focus:outline-none">
        Recibimos tu solicitud
      </h1>
      <p class="mt-2 text-ink-muted">
        Te contactaremos por WhatsApp o correo con el precio final de tu cotización.
      </p>

      <!-- Código: con él la empresa encuentra la solicitud cuando la persona escribe -->
      <div class="mt-6 rounded-md border border-line bg-ground p-4 sm:p-5">
        <p class="text-label text-ink-muted uppercase">Código de tu solicitud</p>
        <div class="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <!-- Un código se dicta y se copia: en móvil va un tamaño menor para que quepa en una
               línea desde 320px. Con letra muy grande se parte en el guion antes que salirse. -->
          <p
            ref="code"
            class="text-title font-extrabold tracking-wide text-ink tabular-nums select-all sm:text-display"
          >
            {{ cotizacion.codigoCotizacion }}
          </p>
          <BaseButton variant="secondary" size="sm" class="max-[400px]:w-full" @click="copyCode">
            <template #icon-left>
              <Check v-if="copyState === 'copiado'" />
              <Copy v-else />
            </template>
            {{ copyState === 'copiado' ? 'Copiado' : 'Copiar código' }}
          </BaseButton>
        </div>
        <p class="mt-2 text-small text-ink-muted">Menciónalo si nos escribes por tu solicitud.</p>
        <!-- Siempre en el DOM para que el lector de pantalla anuncie cada cambio -->
        <p role="status" class="text-small text-ink" :class="copyState === 'seleccionado' ? 'mt-2' : 'sr-only'">
          {{ copyMessage }}
        </p>
      </div>

      <!-- Resumen de lo que se pidió -->
      <h2 class="mt-8 text-card-title text-ink">
        Lo que pediste
        <span class="font-normal text-ink-muted">
          · <span class="tabular-nums">{{ unidades }}</span> {{ unidades === 1 ? 'unidad' : 'unidades' }}
        </span>
      </h2>
      <ul class="mt-2 divide-y divide-line border-y border-line text-small">
        <li v-for="item in cotizacion.items" :key="item.productoId" class="flex justify-between gap-4 py-2.5">
          <span class="min-w-0 text-ink">
            <span class="font-semibold tabular-nums">{{ item.cantidad }} ×</span> {{ item.nombre }}
          </span>
          <span class="shrink-0 text-right text-ink tabular-nums">
            <span class="sr-only">Subtotal referencial: </span>{{ formatearPrecio(item.cantidad * item.precioReferencialUsd) }}
          </span>
        </li>
      </ul>
      <div class="mt-3 flex items-baseline justify-between gap-4">
        <p class="font-semibold text-ink">Total referencial</p>
        <p class="text-price text-ink tabular-nums">{{ formatearPrecio(cotizacion.totalReferencial) }}</p>
      </div>
      <p class="mt-1 text-small text-ink-muted">El precio final te lo confirmamos al responder.</p>

      <div class="mt-8 border-t border-line pt-6">
        <p class="text-small text-ink-muted">¿Tienes prisa o quieres agregar algo?</p>
        <BaseButton variant="whatsapp" :href="whatsappLink" target="_blank" rel="noopener" class="mt-3 max-sm:w-full">
          <template #icon-left><MessageCircle /></template>
          Escríbenos por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
        </BaseButton>
      </div>
    </section>

    <div class="mt-6 flex justify-center">
      <BaseButton variant="ghost" to="/buscar">Seguir viendo el catálogo</BaseButton>
    </div>
  </div>
</template>
