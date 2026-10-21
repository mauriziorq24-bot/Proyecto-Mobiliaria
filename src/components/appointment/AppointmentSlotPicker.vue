<script setup>
import { Check, ChevronLeft, ChevronRight, CircleAlert } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue'
import { describirDia, formatearHora } from '../../utils/fecha'

// Selector de día y hora de una cita (DESIGN.md › Agendar visita › Día / Hora).
// Lo usan el formulario de /agendar-cita y "Reprogramar" en /mi-cita.
// Solo dibuja y avisa: qué días y horas se ofrecen y la validación los decide la vista.
const props = defineProps({
  fecha: { type: String, default: '' }, // 'AAAA-MM-DD'
  hora: { type: String, default: '' }, // 'HH:MM', hora de Caracas
  dias: { type: Array, required: true }, // días con turnos, de diasDisponibles()
  horas: { type: Array, required: true }, // turnos del día elegido, de horariosDelDia()
  errorFecha: { type: String, default: '' },
  errorHora: { type: String, default: '' },
})

// update:fecha / update:hora: lo que eligió la persona (sirven con v-model:fecha y v-model:hora).
// leave: el foco salió del grupo de días ('fecha') o de horas ('hora'); la vista valida ahí.
const emit = defineEmits(['update:fecha', 'update:hora', 'leave'])

// Ids propios: el selector puede estar en más de una página, y los radios necesitan un name único.
const uid = useId()
const radioName = `dia-${uid}`
const horaName = `hora-${uid}`
const fechaMessageId = `${uid}-fecha-message`
const horaMessageId = `${uid}-hora-message`

// La tira se agrupa por mes para poner el nombre ("Noviembre") donde cambia.
const meses = computed(() => {
  const grupos = []
  for (const fecha of props.dias) {
    const dia = { fecha, ...describirDia(fecha) }
    const ultimo = grupos.at(-1)
    if (ultimo?.clave === dia.claveMes) ultimo.dias.push(dia)
    else grupos.push({ clave: dia.claveMes, nombre: dia.mes, dias: [dia] })
  }
  return grupos
})

// Las horas en dos bloques para leerlas más rápido.
const franjas = computed(() =>
  [
    { nombre: 'Mañana', horas: props.horas.filter((hora) => hora < '12:00') },
    { nombre: 'Tarde', horas: props.horas.filter((hora) => hora >= '12:00') },
  ].filter((franja) => franja.horas.length),
)

// Cambiar de día borra la hora: la de otro día podría no existir en este.
function handleDayChange(fecha, event) {
  emit('update:fecha', fecha)
  emit('update:hora', '')
  event.target.closest('label')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: scrollBehavior() })
}

// Día y hora son grupos: su "blur" es cuando el foco sale del grupo entero,
// no cuando pasa de un día a otro con las flechas.
function handleFocusout(field, event) {
  if (!event.currentTarget.contains(event.relatedTarget)) emit('leave', field)
}

// --- Tira de días: botones anterior/siguiente (escritorio) ---
const strip = useTemplateRef('strip')
const root = useTemplateRef('root')
const canScrollPrev = ref(false)
const canScrollNext = ref(false)
let stripObserver = null

function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

function updateStripEdges() {
  const el = strip.value
  if (!el) return
  canScrollPrev.value = el.scrollLeft > 1
  canScrollNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function scrollStrip(direction) {
  const el = strip.value
  el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: scrollBehavior() })
}

// La vista lleva el foco al primer error: estos métodos le dicen dónde está cada grupo.
// En un grupo de radios, el foco va al elegido (o al primero si no hay ninguno).
function focusRadio(name) {
  const radios = [...(root.value?.querySelectorAll(`input[name="${name}"]`) ?? [])]
  const radio = radios.find((r) => r.checked) ?? radios[0]
  radio?.focus()
  return Boolean(radio)
}

function focusDay() {
  focusRadio(radioName)
}

function focusHour() {
  if (!focusRadio(horaName)) focusDay()
}

defineExpose({ focusDay, focusHour })

onMounted(() => {
  updateStripEdges()
  stripObserver = new ResizeObserver(updateStripEdges)
  if (strip.value) stripObserver.observe(strip.value)
})

onBeforeUnmount(() => stripObserver?.disconnect())
</script>

<template>
  <div ref="root" class="min-w-0">
    <div class="flex items-center justify-between gap-4">
      <!-- El título lo pone la vista: "Día y hora" en el formulario, otro en "Reprogramar" -->
      <slot name="title" />

      <!-- Anterior/siguiente para quien usa mouse; en táctil se desliza y con teclado, flechas -->
      <div v-if="dias.length" class="hidden gap-1 md:flex">
        <button
          type="button"
          class="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-ink transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Ver días anteriores"
          :disabled="!canScrollPrev"
          @click="scrollStrip(-1)"
        >
          <ChevronLeft class="size-[18px]" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-ink transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Ver días siguientes"
          :disabled="!canScrollNext"
          @click="scrollStrip(1)"
        >
          <ChevronRight class="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Día: radios nativos escondidos dentro de cada tarjeta. Las flechas recorren los días. -->
    <fieldset
      class="mt-4 min-w-0"
      :aria-describedby="errorFecha ? fechaMessageId : undefined"
      @focusout="handleFocusout('fecha', $event)"
    >
      <legend class="mb-1.5 text-small font-semibold text-ink">Día</legend>

      <p v-if="!dias.length" class="text-small text-ink-muted">
        No hay días disponibles en este momento. Escríbenos por WhatsApp y te ayudamos.
      </p>

      <div
        v-else
        ref="strip"
        class="thin-scrollbar -mx-4 mt-2 flex gap-5 overflow-x-auto px-4 pt-1 pb-3 sm:-mx-1 sm:px-1"
        @scroll.passive="updateStripEdges"
      >
        <div v-for="mes in meses" :key="mes.clave" class="flex shrink-0 flex-col gap-2">
          <!-- El nombre del mes se queda pegado a la izquierda mientras se ven sus días -->
          <p class="sticky left-0 w-max text-label text-ink-muted uppercase" aria-hidden="true">
            {{ mes.nombre }}
          </p>
          <div class="flex gap-2">
            <!-- min-h/min-w (no medidas fijas): con letra grande del sistema la tarjeta crece -->
            <label
              v-for="dia in mes.dias"
              :key="dia.fecha"
              class="relative flex min-h-[76px] min-w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border px-1 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
              :class="
                fecha === dia.fecha
                  ? 'border-brand-deep bg-brand-tint text-brand-deep'
                  : 'border-line-strong bg-surface text-ink hover:border-ink-muted'
              "
            >
              <input
                type="radio"
                :name="radioName"
                :value="dia.fecha"
                :checked="fecha === dia.fecha"
                :aria-invalid="errorFecha ? 'true' : undefined"
                class="sr-only"
                @change="handleDayChange(dia.fecha, $event)"
              />
              <span class="text-small capitalize" aria-hidden="true">{{ dia.diaSemana }}</span>
              <span class="text-title font-bold tabular-nums" aria-hidden="true">{{ dia.dia }}</span>
              <span class="sr-only">{{ dia.completo }}</span>
              <Check
                v-if="fecha === dia.fecha"
                class="absolute top-1.5 right-1.5 size-3"
                :stroke-width="3"
                aria-hidden="true"
              />
            </label>
          </div>
        </div>
      </div>

      <div aria-live="polite">
        <p v-if="errorFecha" :id="fechaMessageId" class="mt-1.5 flex items-start gap-1.5 text-small text-error">
          <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
          {{ errorFecha }}
        </p>
      </div>
    </fieldset>

    <!-- Hora: radios nativos escondidos, igual que los días (una sola hora; las flechas recorren
         Mañana y Tarde porque comparten name). -->
    <fieldset
      class="mt-6 min-w-0"
      :aria-describedby="errorHora ? horaMessageId : undefined"
      @focusout="handleFocusout('hora', $event)"
    >
      <legend class="mb-1.5 text-small font-semibold text-ink">Hora</legend>
      <p v-if="!fecha" class="text-small text-ink-muted">Elige un día para ver las horas disponibles.</p>
      <div v-else class="flex flex-col gap-4">
        <div v-for="franja in franjas" :key="franja.nombre" role="group" :aria-label="franja.nombre">
          <p class="mb-2 text-small text-ink-muted" aria-hidden="true">{{ franja.nombre }}</p>
          <!-- Columnas de al menos 6.5rem: "10:30 a. m." siempre cabe, y con letra grande caben menos -->
          <div class="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
            <label
              v-for="opcion in franja.horas"
              :key="opcion"
              class="relative inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-2 py-1 text-small font-semibold whitespace-nowrap tabular-nums transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
              :class="
                hora === opcion
                  ? 'border-brand-deep bg-brand-tint text-brand-deep'
                  : 'border-line-strong bg-surface text-ink hover:border-ink-muted'
              "
            >
              <input
                type="radio"
                :name="horaName"
                :value="opcion"
                :checked="hora === opcion"
                :aria-invalid="errorHora ? 'true' : undefined"
                class="sr-only"
                @change="emit('update:hora', opcion)"
              />
              {{ formatearHora(opcion) }}
              <!-- En la esquina, como en los días: no le quita ancho a la hora -->
              <Check
                v-if="hora === opcion"
                class="absolute top-1 right-1 size-3"
                :stroke-width="3"
                aria-hidden="true"
              />
            </label>
          </div>
        </div>
      </div>

      <div aria-live="polite">
        <p v-if="errorHora" :id="horaMessageId" class="mt-1.5 flex items-start gap-1.5 text-small text-error">
          <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
          {{ errorHora }}
        </p>
      </div>
    </fieldset>
  </div>
</template>
