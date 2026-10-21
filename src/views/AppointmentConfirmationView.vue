<script setup>
import { CalendarPlus, Check, CircleCheck, Copy, MessageCircle } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import { company } from '../config/empresa'
import { descargarIcs } from '../utils/calendario'
import { buscarCitaReciente } from '../utils/citasGuardadas'
import { describirDia, desdeFechaHoraBackend, formatearFechaHora, formatearHora } from '../utils/fecha'
import { etiquetaTipoAsesoria } from '../utils/formato'
import { cambiarCitaUrl, citaAgendadaUrl } from '../utils/whatsapp'

// Confirmación de una cita recién creada (DESIGN.md › Agendar visita › Confirmación).
// Lee la cita guardada en este navegador (src/utils/citasGuardadas.js): recargar la página
// no la vuelve a enviar. El guard de la ruta ya revisó que exista; si no, llevó a /agendar-cita.

const route = useRoute()

const cita = computed(() => {
  const guardada = buscarCitaReciente(route.query.codigo)
  if (!guardada) return null
  const { fecha, hora } = desdeFechaHoraBackend(guardada.fechaHora)
  return { ...guardada, fecha, hora }
})

// Los textos se arman una vez y se usan en pantalla y en los mensajes de WhatsApp.
const textos = computed(() => {
  if (!cita.value) return null
  const { codigoCita, fecha, hora, tipoAsesoria } = cita.value
  const tipo = etiquetaTipoAsesoria(tipoAsesoria)
  const cuando = formatearFechaHora(fecha, hora)
  return {
    tipo,
    dia: describirDia(fecha).completo,
    hora: formatearHora(hora),
    avisarUrl: citaAgendadaUrl({ codigoCita, tipo, cuando }),
    cambiarUrl: cambiarCitaUrl({ codigoCita, cuando }),
  }
})

// "Volver al producto" si la persona llegó al formulario desde una ficha (?producto=ID).
const productoId = typeof route.query.producto === 'string' ? route.query.producto : null

function agregarAlCalendario() {
  const { codigoCita, fecha, hora, tipoAsesoria } = cita.value
  descargarIcs({ codigoCita, fecha, hora, tipoAsesoria })
}

// --- Copiar el código ---
// copyState: '' (nada), 'copiado' o 'seleccionado' (el portapapeles falló: el código queda
// seleccionado para copiarlo a mano). El texto de copyMessage lo anuncia la región role="status".
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
    await navigator.clipboard.writeText(cita.value.codigoCita)
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

// El foco empieza en el título: un lector de pantalla anuncia de inmediato que la cita quedó agendada.
const heading = useTemplateRef('heading')
onMounted(() => heading.value?.focus())
onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <div v-if="cita" class="mx-auto w-full max-w-xl px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
    <section aria-labelledby="cita-ok-title" class="sm:rounded-md sm:border sm:border-line sm:bg-surface sm:p-8">
      <span class="inline-flex size-12 items-center justify-center rounded-full bg-success-bg text-success">
        <CircleCheck class="size-6" aria-hidden="true" />
      </span>
      <h1 id="cita-ok-title" ref="heading" tabindex="-1" class="mt-4 text-headline text-balance text-ink focus:outline-none">
        Tu visita quedó agendada
      </h1>
      <!-- Sin punto final: la hora ya termina en "p. m." -->
      <p class="mt-2 text-ink-muted">
        Te esperamos el <strong class="font-semibold text-ink">{{ textos.dia }}</strong> a las
        <strong class="font-semibold whitespace-nowrap text-ink">{{ textos.hora }}</strong>
      </p>

      <!-- Código: lo más importante de la pantalla, es la única forma de cambiar o cancelar la cita -->
      <div class="mt-6 rounded-md border border-line bg-ground p-4 sm:p-5">
        <p id="cita-codigo-label" class="text-label text-ink-muted uppercase">Código de tu cita</p>
        <div class="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p
            ref="code"
            aria-labelledby="cita-codigo-label"
            class="text-display font-extrabold tracking-wide text-ink tabular-nums select-all"
          >
            {{ cita.codigoCita }}
          </p>
          <BaseButton variant="secondary" size="sm" class="max-[400px]:w-full" @click="copyCode">
            <template #icon-left>
              <Check v-if="copyState === 'copiado'" />
              <Copy v-else />
            </template>
            {{ copyState === 'copiado' ? 'Copiado' : 'Copiar código' }}
          </BaseButton>
        </div>
        <p class="mt-2 text-small text-ink-muted">Guárdalo: lo necesitas para cambiar o cancelar tu cita.</p>
        <!-- Siempre en el DOM para que el lector de pantalla anuncie cada cambio -->
        <p role="status" class="text-small text-ink" :class="copyState === 'seleccionado' ? 'mt-2' : 'sr-only'">
          {{ copyMessage }}
        </p>
      </div>

      <dl class="mt-6 divide-y divide-line text-small">
        <div class="flex justify-between gap-4 py-2.5">
          <dt class="text-ink-muted">Asesoría</dt>
          <dd class="text-right font-semibold text-ink">{{ textos.tipo }}</dd>
        </div>
        <div class="flex justify-between gap-4 py-2.5">
          <dt class="text-ink-muted">Día</dt>
          <dd class="text-right font-semibold text-ink first-letter:uppercase">{{ textos.dia }}</dd>
        </div>
        <div class="flex justify-between gap-4 py-2.5">
          <dt class="text-ink-muted">Hora</dt>
          <dd class="text-right font-semibold text-ink tabular-nums">{{ textos.hora }}</dd>
        </div>
        <div class="flex justify-between gap-4 py-2.5">
          <dt class="text-ink-muted">Lugar</dt>
          <dd class="text-right text-ink">
            Showroom · {{ company.showroom.address }}
            <a
              v-if="company.showroom.mapsUrl"
              :href="company.showroom.mapsUrl"
              target="_blank"
              rel="noopener"
              class="mt-0.5 block font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper"
            >
              Cómo llegar<span class="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </dd>
        </div>
      </dl>

      <!-- El único botón de WhatsApp destacado de la pantalla: avisar a la empresa -->
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <BaseButton variant="whatsapp" :href="textos.avisarUrl" target="_blank" rel="noopener">
          <template #icon-left><MessageCircle /></template>
          Avisar por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
        </BaseButton>
        <BaseButton variant="secondary" @click="agregarAlCalendario">
          <template #icon-left><CalendarPlus /></template>
          Agregar a mi calendario
        </BaseButton>
      </div>

      <section aria-labelledby="cita-cambios-title" class="mt-8 border-t border-line pt-6">
        <h2 id="cita-cambios-title" class="text-card-title text-ink">¿Necesitas cambiarla o cancelarla?</h2>
        <p class="mt-1 text-small text-ink-muted">Con tu código puedes elegir otro día u hora, o cancelar la visita.</p>
        <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <BaseButton variant="secondary" to="/mi-cita" class="max-sm:w-full">Cambiar o cancelar mi cita</BaseButton>
          <p class="text-small text-ink-muted max-sm:w-full max-sm:text-center">
            o
            <a
              :href="textos.cambiarUrl"
              target="_blank"
              rel="noopener"
              class="font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper"
            >
              escríbenos por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </p>
        </div>
      </section>
    </section>

    <div class="mt-6 flex justify-center">
      <BaseButton v-if="productoId" variant="ghost" :to="{ name: 'product', params: { id: productoId } }">
        Volver al producto
      </BaseButton>
      <BaseButton v-else variant="ghost" to="/">Seguir viendo el catálogo</BaseButton>
    </div>
  </div>
</template>
