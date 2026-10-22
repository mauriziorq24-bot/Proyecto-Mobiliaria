<script setup>
import { MessageCircle } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useBottomBarHeight } from '../../composables/useBottomBarHeight'
import { useCotizacionStore } from '../../stores/cotizacion'
import { formatearPrecio } from '../../utils/formato'
import { cotizacionUrl } from '../../utils/whatsapp'
import BaseButton from '../ui/BaseButton.vue'

// Barra de cotización (solo móvil, DESIGN.md › Barra de cotización): mantiene a la vista la
// cotización en curso. AppLayout decide cuándo se muestra: solo con productos y nunca en las
// rutas con meta.ocultarBarraCotizacion (ficha, cotización, cita, login y registro).
const cotizacion = useCotizacionStore()

const totalTexto = computed(() => formatearPrecio(cotizacion.totalReferencial))

// Solo los productos que siguen en el catálogo: los demás no se pueden cotizar.
const whatsappLink = computed(() => cotizacionUrl(cotizacion.itemsDisponibles, totalTexto.value))

const bar = ref(null)
useBottomBarHeight(bar)
</script>

<template>
  <!--
    sticky bottom-0 como último elemento del layout: flota sobre la página y, al llegar al final,
    queda debajo del footer en vez de taparlo (no hace falta reservar espacio).
  -->
  <aside
    ref="bar"
    aria-label="Mi cotización"
    class="sticky bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgb(20_23_28/0.14)] md:hidden"
  >
    <p class="flex items-baseline justify-between gap-3 text-small">
      <span class="font-semibold text-ink">
        Mi cotización · <span class="tabular-nums">{{ cotizacion.totalUnidades }}</span>
      </span>
      <span class="text-ink-muted">
        <span aria-hidden="true">ref.</span>
        <span class="sr-only">Total referencial</span>
        <span class="tabular-nums">{{ totalTexto }}</span>
      </span>
    </p>
    <div class="mt-2 flex gap-3">
      <!-- Lleva a la página de la cotización: ahí se revisa y se envía. Llevar no es solicitar. -->
      <BaseButton to="/carrito" class="min-w-0 flex-1">Ver mi cotización</BaseButton>
      <BaseButton
        variant="whatsapp"
        :href="whatsappLink"
        target="_blank"
        rel="noopener"
        aria-label="Enviar cotización por WhatsApp"
      >
        <template #icon-left><MessageCircle /></template>
        WhatsApp
      </BaseButton>
    </div>
  </aside>
</template>
