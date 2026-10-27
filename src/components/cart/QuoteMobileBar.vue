<script setup>
import { ref } from 'vue'
import { useAlturaFija } from '../../composables/useAlturaFija'

// Barra fija de Mi cotización en móvil y tablet: total referencial + la acción principal (slot).
// Reemplaza a la barra global (la ruta tiene meta.ocultarBarraCotizacion). "Vaciar" no va aquí.
// Es un componente aparte para que useAlturaFija viva y muera con la barra: así el aviso
// breve (AppToast) aparece encima de ella y baja cuando la barra se quita.
defineProps({
  // Total ya formateado con formatearPrecio.
  total: { type: String, required: true },
})

const bar = ref(null)
useAlturaFija(bar, '--altura-barra-inferior')
</script>

<template>
  <!--
    sticky bottom-0 como último hijo del bloque de la lista y el resumen: flota mientras se revisa
    la lista y se detiene al terminar ese bloque, antes del formulario, así no lo tapa al escribir.
    -mx-4 / md:-mx-6 compensan el margen de container-page para que la barra ocupe todo el ancho.
  -->
  <div
    ref="bar"
    class="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-dock md:-mx-6 md:px-6 lg:hidden"
  >
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p class="min-w-0">
        <span class="block text-small text-ink-muted">Total referencial</span>
        <span class="block text-price text-ink tabular-nums">{{ total }}</span>
      </p>
      <!--
        grow sin min-w-0: el botón mide al menos su texto. Si no cabe junto al total (pantalla
        angosta o letra grande), baja a su propia fila a todo el ancho en vez de cortar el texto.
      -->
      <div class="flex grow justify-end [&>*]:w-full sm:[&>*]:max-w-72">
        <slot />
      </div>
    </div>
  </div>
</template>
