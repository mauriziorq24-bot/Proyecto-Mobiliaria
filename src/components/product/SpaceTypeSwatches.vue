<script setup>
import { Check, X } from 'lucide-vue-next'
import { useId } from 'vue'
import { TIPOS_ESPACIO } from '../../config/tiposEspacio'

// Tira de muestras de tela (la firma de DESIGN.md): filtra por tipo de espacio.
// defineModel crea un v-model: el padre escribe <SpaceTypeSwatches v-model="tipo" />
// y recibe el valor elegido ('OFICINA', 'HOGAR'…) o null si no hay filtro.
const selected = defineModel({ type: String, default: null })

defineProps({
  // Lista de { valor, etiqueta, icon, swatchClass } (por defecto, los de API.md).
  tipos: { type: Array, default: () => TIPOS_ESPACIO },
})

const labelId = useId()

// Tocar la muestra elegida otra vez quita el filtro.
function toggle(valor) {
  selected.value = selected.value === valor ? null : valor
}

const hideScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
</script>

<template>
  <div>
    <div class="flex min-h-9 items-center justify-between gap-4">
      <p :id="labelId" class="text-label text-ink-muted uppercase">Tipo de espacio</p>
      <button
        v-if="selected"
        type="button"
        class="relative -mr-2 inline-flex items-center gap-1 rounded-sm px-2 py-1 text-small font-semibold text-brand-deep transition-colors duration-200 ease-out hover:bg-brand-tint before:absolute before:inset-x-0 before:-inset-y-1.5"
        @click="selected = null"
      >
        <X class="size-4" aria-hidden="true" />
        Quitar filtro
      </button>
    </div>

    <!--
      -mx-4 px-4 en móvil: la tira se desliza de borde a borde de la pantalla.
      pt/pb dejan lugar al anillo de foco y a la sombra de la muestra elegida. Desde md, -mx-1 px-1
      hace lo mismo a los lados: el scroll recortaba el anillo de la primera muestra.
    -->
    <div :class="hideScrollbar" class="-mx-4 overflow-x-auto px-4 pt-2 pb-6 md:-mx-1 md:px-1">
      <div role="group" :aria-labelledby="labelId" class="flex h-[156px] w-max items-end">
        <!--
          Cada muestra se monta 18px sobre la anterior, como un abanico de telas.
          La elegida sube por encima (z-10), crece de 136px a 156px y proyecta sombra.
        -->
        <button
          v-for="(tipo, index) in tipos"
          :key="tipo.valor"
          type="button"
          class="relative w-[120px] shrink-0 rounded-t-md rounded-b-[6px] transition-[height,filter] duration-200 ease-out focus-visible:z-20"
          :class="[
            index > 0 && '-ml-[18px]',
            selected === tipo.valor
              ? 'z-10 h-[156px] drop-shadow-[0_10px_14px_rgb(20_23_28/0.2)]'
              : 'h-[136px] hover:h-[142px]',
          ]"
          :aria-pressed="selected === tipo.valor"
          @click="toggle(tipo.valor)"
        >
          <!--
            La tela: la máscara abre el ojal de 11px (el agujero del aro del muestrario).
            Va a 30px del borde, fuera de los 18px con que esta muestra se monta sobre la anterior:
            es un agujero de verdad y por él se ve el fondo de la página.
          -->
          <span
            class="absolute inset-0 flex flex-col items-start justify-end gap-2 overflow-hidden rounded-[inherit] p-3 text-left [mask-image:radial-gradient(circle_at_30px_18px,transparent_5.5px,black_6px)]"
            :class="tipo.swatchClass"
          >
            <!-- Trama diagonal: solo en la muestra elegida, del mismo color que el texto -->
            <span
              v-if="selected === tipo.valor"
              class="absolute inset-0 bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,currentColor_9%,transparent)_0_1.5px,transparent_1.5px_6px)]"
              aria-hidden="true"
            />
            <!-- Marca de elegida: no depende solo del tamaño ni de la sombra (aria-pressed lo dice al lector) -->
            <span
              v-if="selected === tipo.valor"
              class="absolute top-2.5 right-[26px] flex size-6 items-center justify-center rounded-full bg-white text-ink shadow-sm"
              aria-hidden="true"
            >
              <Check class="size-4" :stroke-width="2.5" />
            </span>
            <component :is="tipo.icon" class="relative size-5" :stroke-width="1.75" aria-hidden="true" />
            <span class="relative pr-[18px] text-sm leading-tight font-bold">{{ tipo.etiqueta }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
