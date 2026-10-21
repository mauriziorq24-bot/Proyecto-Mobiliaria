<script setup>
import { CalendarCheck, CalendarClock, CalendarX, Info, TriangleAlert } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AppointmentSlotPicker from '../components/appointment/AppointmentSlotPicker.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseConfirmDialog from '../components/ui/BaseConfirmDialog.vue'
import BaseFormError from '../components/ui/BaseFormError.vue'
import { useAsync } from '../composables/useAsync'
import { useToast } from '../composables/useToast'
import { cancelarCita, ERRORES_CITA, modificarCita } from '../services/citaService'
import { submitErrorMessage } from '../services/errorMessages'
import { useAuthStore } from '../stores/auth'
import { actualizarCitaGuardada, leerCitasGuardadas, quitarCitaGuardada } from '../utils/citasGuardadas'
import {
  aFechaHoraBackend,
  ahoraEnCaracas,
  describirDia,
  desdeFechaHoraBackend,
  diasDisponibles,
  esHorarioDisponible,
  formatearFechaHora,
  formatearHora,
  horariosDelDia,
} from '../utils/fecha'
import { etiquetaTipoAsesoria } from '../utils/formato'
import { isTokenExpired } from '../utils/jwt'
import { citaNoEncontradaUrl, consultarCitaUrl } from '../utils/whatsapp'

// Mis visitas: reprogramar o cancelar las citas agendadas desde este navegador
// (DESIGN.md › Mis visitas). La ruta exige sesión porque PUT y DELETE exigen token.

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

// "Ahora" se actualiza cada minuto: una visita que empieza pasa sola a "Visitas anteriores".
const ahora = shallowRef(ahoraEnCaracas())
let relojTimer = null

// --- Citas guardadas ---
// TODO: cuando el backend tenga un GET de las citas del usuario (pendientes 16 y 17 de API.md),
// pedirlas a la API con useAsync (cargando, error y vacío) en lugar de leer localStorage.
const guardadas = shallowRef(leerCitasGuardadas())

function recargar() {
  guardadas.value = leerCitasGuardadas()
}

// Si otra pestaña agenda, cambia o cancela una cita, esta lista se pone al día.
function onStorage(event) {
  if (event.key === null || event.key === 'mobiliario.citas') recargar()
}

// Cada cita con su fecha y hora separadas y los textos ya listos para la pantalla.
// Una cita con fechaHora ilegible (editada a mano, otra versión) no se muestra.
const citas = computed(() =>
  guardadas.value.flatMap((guardada) => {
    try {
      const { fecha, hora } = desdeFechaHoraBackend(guardada.fechaHora)
      const dia = describirDia(fecha)
      return [
        {
          ...guardada,
          fecha,
          hora,
          dia,
          horaTexto: formatearHora(hora),
          tipo: etiquetaTipoAsesoria(guardada.tipoAsesoria),
          cuando: formatearFechaHora(fecha, hora),
          inicio: `${fecha}T${hora}`, // se puede comparar como texto
        },
      ]
    } catch {
      return []
    }
  }),
)

// Una visita que ya empezó cuenta como anterior: ya no tiene sentido cambiarla.
const ahoraTexto = computed(() => `${ahora.value.fecha}T${ahora.value.hora}`)
const proximas = computed(() =>
  citas.value.filter((c) => c.inicio > ahoraTexto.value).sort((a, b) => a.inicio.localeCompare(b.inicio)),
)
const anteriores = computed(() =>
  citas.value.filter((c) => c.inicio <= ahoraTexto.value).sort((a, b) => b.inicio.localeCompare(a.inicio)),
)

const headingId = (cita) => `cita-${cita.codigoCita}-titulo`

async function focusById(id) {
  await nextTick()
  document.getElementById(id)?.focus({ preventScroll: false })
}

// --- Aviso: la cita ya no existe en el backend ---
const aviso = ref(null) // { texto, whatsappUrl }

function quitarInexistente(cita) {
  quitarCitaGuardada(cita.codigoCita)
  recargar()
  aviso.value = {
    texto: `No encontramos tu visita del ${cita.dia.completo} (${cita.codigoCita}): puede que ya se haya cancelado. La quitamos de la lista.`,
    whatsappUrl: citaNoEncontradaUrl({ codigoCita: cita.codigoCita, cuando: cita.cuando }),
  }
  // El botón que se usó desapareció con la tarjeta: el foco va al aviso para que se lea.
  focusById('mi-cita-aviso')
}

// --- Sesión vencida ---
// Antes de enviar (el token pudo vencer con la página abierta) o si el backend responde 401/403.
function sesionVencida() {
  if (auth.token) auth.logout()
  toast.show('Tu sesión venció. Ingresa de nuevo para cambiar tu visita.', 6000)
  // Si el 401 ya llevó al login (main.js), no se navega otra vez.
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login', query: { redirect: '/mi-cita' } })
  }
}

function tokenVigente() {
  return Boolean(auth.token) && !isTokenExpired(auth.token)
}

// --- Reprogramar ---
// Una sola tarjeta a la vez muestra el selector de día y hora.
const editando = ref(null) // codigoCita
const nuevo = reactive({ fecha: '', hora: '' })
const errors = reactive({ fecha: '', hora: '' })
const attempted = ref(false)
// Un ref dentro de v-for sería un arreglo: el selector abierto (solo hay uno) se guarda con una función.
const slotPicker = shallowRef(null)
function setSlotPicker(el) {
  slotPicker.value = el
}

const citaEditando = computed(() => proximas.value.find((c) => c.codigoCita === editando.value) ?? null)
const dias = computed(() => diasDisponibles(undefined, ahora.value))
const horas = computed(() => (nuevo.fecha ? horariosDelDia(nuevo.fecha, ahora.value) : []))

const { loading: guardando, error: errorGuardar, execute: enviarCambio } = useAsync(
  (codigo, datos) => modificarCita(codigo, datos),
  { immediate: false },
)
const mensajeGuardar = ref('')

const rules = {
  fecha(value) {
    if (!value) return 'Elige el nuevo día.'
    if (!dias.value.includes(value)) return 'Ese día ya no está disponible. Elige otro.'
    return ''
  },
  hora(value) {
    if (!nuevo.fecha) return ''
    if (!value) return 'Elige la nueva hora.'
    if (!esHorarioDisponible(nuevo.fecha, value, ahora.value)) return 'Esa hora ya pasó. Elige otra.'
    const actual = citaEditando.value
    if (actual && nuevo.fecha === actual.fecha && value === actual.hora) {
      return 'Es el mismo horario que ya tienes. Elige otro.'
    }
    return ''
  },
}

function validateField(field) {
  errors[field] = rules[field](nuevo[field])
}

function selectDay(fecha) {
  nuevo.fecha = fecha
  if (attempted.value) validateField('fecha')
}

function selectHora(hora) {
  nuevo.hora = hora
  if (hora) {
    if (attempted.value) validateField('hora')
  } else {
    errors.hora = ''
  }
}

function handleLeave(field) {
  if (attempted.value) validateField(field)
}

function abrirEditor(cita) {
  if (editando.value === cita.codigoCita) {
    cerrarEditor()
    return
  }
  editando.value = cita.codigoCita
  nuevo.fecha = ''
  nuevo.hora = ''
  errors.fecha = ''
  errors.hora = ''
  attempted.value = false
  mensajeGuardar.value = ''
  aviso.value = null
}

function cerrarEditor({ devolverFoco = true } = {}) {
  const codigo = editando.value
  editando.value = null
  mensajeGuardar.value = ''
  if (devolverFoco && codigo) focusById(`cita-${codigo}-reprogramar`)
}

const resumenNuevo = computed(() => {
  if (!nuevo.fecha) return 'Elige un día'
  const dia = describirDia(nuevo.fecha).completo
  // Espacios no separables en la hora: "2:30 p. m." no se parte entre dos líneas.
  return nuevo.hora ? `${dia}, ${formatearHora(nuevo.hora).replace(/ /g, ' ')}` : `${dia} · elige una hora`
})

async function guardarCambio() {
  if (guardando.value || !citaEditando.value) return
  attempted.value = true
  mensajeGuardar.value = ''
  ahora.value = ahoraEnCaracas()
  validateField('fecha')
  validateField('hora')
  if (errors.fecha) return slotPicker.value?.focusDay()
  if (errors.hora) return slotPicker.value?.focusHour()

  if (!tokenVigente()) return sesionVencida()

  const cita = citaEditando.value
  // PUT pide el CitaRequest completo: los datos guardados al crearla, con la nueva fecha y hora.
  const { codigoCita, nombreCliente, empresa, telefono, email, tipoAsesoria, notas } = cita
  await enviarCambio(codigoCita, {
    nombreCliente,
    empresa,
    telefono,
    email,
    tipoAsesoria,
    notas,
    fecha: nuevo.fecha,
    hora: nuevo.hora,
  })

  const error = errorGuardar.value
  if (!error) {
    actualizarCitaGuardada(codigoCita, { fechaHora: aFechaHoraBackend(nuevo.fecha, nuevo.hora) })
    const cuando = formatearFechaHora(nuevo.fecha, nuevo.hora)
    recargar()
    cerrarEditor({ devolverFoco: false })
    toast.show(`Listo: tu visita quedó para el ${cuando}.`, 6000)
    focusById(`cita-${codigoCita}-titulo`)
    return
  }

  if (error.code === ERRORES_CITA.SESION_VENCIDA) return sesionVencida()
  if (error.code === ERRORES_CITA.CITA_NO_ENCONTRADA) {
    cerrarEditor({ devolverFoco: false })
    return quitarInexistente(cita)
  }
  if (error.code === ERRORES_CITA.DATOS_INVALIDOS) {
    const campos = error.campos ?? []
    // Algo distinto del horario: los datos guardados en el navegador están dañados.
    if (campos.some((campo) => campo !== 'fechaHora')) {
      mensajeGuardar.value = `No pudimos usar los datos guardados de esta cita. Escríbenos por WhatsApp con tu código (${codigoCita}) y la cambiamos por ti.`
      return
    }
    // El backend no dice qué falló: lo más probable es que el turno haya pasado.
    ahora.value = ahoraEnCaracas()
    validateField('fecha')
    validateField('hora')
    if (!errors.fecha && !errors.hora) errors.hora = 'Ese horario ya no está disponible. Elige otra hora.'
    await nextTick()
    return errors.fecha ? slotPicker.value?.focusDay() : slotPicker.value?.focusHour()
  }
  mensajeGuardar.value = submitErrorMessage(error, 'cambiar tu visita')
}

// --- Cancelar ---
const porCancelar = ref(null) // la cita que se está por cancelar (abre el diálogo)
const mensajeCancelar = ref('')
const { loading: cancelando, error: errorCancelar, execute: enviarCancelacion } = useAsync(
  (codigo) => cancelarCita(codigo),
  { immediate: false },
)

function pedirCancelacion(cita) {
  aviso.value = null
  mensajeCancelar.value = ''
  porCancelar.value = cita
}

function cerrarDialogo() {
  if (!cancelando.value) porCancelar.value = null
}

async function confirmarCancelacion() {
  const cita = porCancelar.value
  if (!cita || cancelando.value) return
  mensajeCancelar.value = ''

  if (!tokenVigente()) {
    porCancelar.value = null
    return sesionVencida()
  }

  await enviarCancelacion(cita.codigoCita)
  const error = errorCancelar.value

  if (!error) {
    if (editando.value === cita.codigoCita) cerrarEditor({ devolverFoco: false })
    quitarCitaGuardada(cita.codigoCita)
    recargar()
    porCancelar.value = null
    toast.show(`Cancelamos tu visita del ${cita.dia.completo}.`, 6000)
    // La tarjeta ya no está: el foco va al título de la lista.
    focusById('mi-cita-proximas')
    return
  }

  if (error.code === ERRORES_CITA.SESION_VENCIDA) {
    porCancelar.value = null
    return sesionVencida()
  }
  if (error.code === ERRORES_CITA.CITA_NO_ENCONTRADA) {
    porCancelar.value = null
    return quitarInexistente(cita)
  }
  // Otro error (red, servidor): el diálogo sigue abierto con el mensaje, para reintentar.
  mensajeCancelar.value = submitErrorMessage(error, 'cancelar tu visita')
}

const tituloDialogo = computed(() =>
  porCancelar.value ? `¿Cancelar tu visita del ${porCancelar.value.dia.completo}?` : '',
)

onMounted(() => {
  relojTimer = setInterval(() => (ahora.value = ahoraEnCaracas()), 60_000)
  window.addEventListener('storage', onStorage)
})

onBeforeUnmount(() => {
  clearInterval(relojTimer)
  window.removeEventListener('storage', onStorage)
})
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12 sm:pb-16">
    <h1 class="text-headline text-ink">Mis visitas</h1>
    <p class="mt-2 max-w-[60ch] text-ink-muted">Cambia el día y la hora de una visita, o cancélala si ya no puedes venir.</p>

    <p class="mt-6 flex items-start gap-2.5 rounded-md bg-brand-tint px-3.5 py-3 text-small text-ink">
      <Info class="mt-px size-4 shrink-0 text-brand-deep" aria-hidden="true" />
      <span>
        Aquí aparecen solo las citas agendadas desde este navegador. Para otras,
        <a
          :href="consultarCitaUrl()"
          target="_blank"
          rel="noopener"
          class="font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper"
        >
          escríbenos por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span></a
        >
        con tu código.
      </span>
    </p>

    <!-- La cita ya no existe en el backend: se quitó de la lista y se explica aquí -->
    <div
      v-if="aviso"
      id="mi-cita-aviso"
      role="alert"
      tabindex="-1"
      class="mt-4 flex items-start gap-2.5 rounded-md bg-warning-bg px-3.5 py-3 text-small text-ink focus:outline-none"
    >
      <TriangleAlert class="mt-px size-4 shrink-0 text-warning" aria-hidden="true" />
      <p>
        {{ aviso.texto }}
        <a
          :href="aviso.whatsappUrl"
          target="_blank"
          rel="noopener"
          class="font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper"
        >
          ¿Crees que es un error? Escríbenos por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
        </a>
      </p>
    </div>

    <section aria-labelledby="mi-cita-proximas" class="mt-10">
      <h2 id="mi-cita-proximas" tabindex="-1" class="text-title text-ink focus:outline-none">Próximas visitas</h2>

      <!-- Vacío -->
      <div
        v-if="!proximas.length"
        class="mt-4 flex flex-col items-start gap-4 rounded-md border border-line bg-surface px-5 py-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-card-title text-ink">No tienes visitas próximas</p>
          <p class="mt-1 text-small text-ink-muted">Ven a ver y probar los muebles en nuestro showroom.</p>
        </div>
        <BaseButton to="/agendar-cita" variant="visit" class="max-sm:w-full">
          <template #icon-left><CalendarCheck /></template>
          Agendar visita
        </BaseButton>
      </div>

      <ul v-else class="mt-4 flex flex-col gap-3">
        <li
          v-for="cita in proximas"
          :key="cita.codigoCita"
          class="rounded-md border bg-surface p-4 transition-colors sm:p-5"
          :class="editando === cita.codigoCita ? 'border-line-strong' : 'border-line'"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <!-- La fecha como en la tira de días del formulario: se reconoce de un vistazo -->
            <div class="flex min-w-0 flex-1 items-start gap-4">
              <div
                class="flex min-h-[76px] min-w-16 shrink-0 flex-col px-1 py-2 items-center justify-center rounded-md border border-line bg-ground text-ink"
                aria-hidden="true"
              >
                <span class="text-small capitalize">{{ cita.dia.diaSemana }}</span>
                <span class="text-title font-bold tabular-nums">{{ cita.dia.dia }}</span>
              </div>
              <div class="min-w-0">
                <h3
                  :id="headingId(cita)"
                  tabindex="-1"
                  class="text-card-title text-ink first-letter:uppercase focus:outline-none"
                >
                  {{ cita.dia.completo }}
                </h3>
                <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-small text-ink-muted">
                  <span class="font-semibold text-ink tabular-nums">{{ cita.horaTexto }}</span>
                  <span aria-hidden="true">·</span>
                  <span class="inline-flex items-center gap-1.5">
                    {{ cita.tipo }}
                    <!-- Punto dorado: la visita al showroom (regla del dorado) -->
                    <span
                      v-if="cita.tipoAsesoria === 'VISITA_SHOWROOM'"
                      class="size-2 shrink-0 rounded-full bg-showroom-gold"
                      aria-hidden="true"
                    />
                  </span>
                </p>
                <p class="mt-1.5 text-small text-ink-muted">
                  Código
                  <span class="font-semibold tracking-wide text-ink tabular-nums select-all">{{ cita.codigoCita }}</span>
                </p>
              </div>
            </div>

            <div class="flex gap-2 max-sm:[&>*]:flex-1">
              <BaseButton
                :id="`cita-${cita.codigoCita}-reprogramar`"
                variant="secondary"
                size="sm"
                :aria-expanded="editando === cita.codigoCita"
                :aria-controls="editando === cita.codigoCita ? `cita-${cita.codigoCita}-editor` : undefined"
                @click="abrirEditor(cita)"
              >
                <template #icon-left><CalendarClock /></template>
                Reprogramar<span class="sr-only"> la visita del {{ cita.dia.completo }}</span>
              </BaseButton>
              <BaseButton variant="ghost" size="sm" @click="pedirCancelacion(cita)">
                <template #icon-left><CalendarX /></template>
                Cancelar visita<span class="sr-only"> del {{ cita.dia.completo }}</span>
              </BaseButton>
            </div>
          </div>

          <!-- Reprogramar: los mismos selectores de día y hora del formulario -->
          <form
            v-if="editando === cita.codigoCita"
            :id="`cita-${cita.codigoCita}-editor`"
            novalidate
            class="mt-5 border-t border-line pt-5"
            :aria-labelledby="`cita-${cita.codigoCita}-editor-titulo`"
            @submit.prevent="guardarCambio"
          >
            <AppointmentSlotPicker
              :ref="setSlotPicker"
              :fecha="nuevo.fecha"
              :hora="nuevo.hora"
              :dias="dias"
              :horas="horas"
              :error-fecha="errors.fecha"
              :error-hora="errors.hora"
              @update:fecha="selectDay"
              @update:hora="selectHora"
              @leave="handleLeave"
            >
              <template #title>
                <div>
                  <h4 :id="`cita-${cita.codigoCita}-editor-titulo`" class="font-bold text-ink">Elige el nuevo día y hora</h4>
                  <p class="mt-0.5 text-small text-ink-muted">
                    Ahora: <span class="inline-block first-letter:uppercase">{{ cita.cuando }}</span>
                  </p>
                </div>
              </template>
            </AppointmentSlotPicker>

            <div class="mt-6 rounded-md bg-ground px-4 py-3 text-small">
              <span class="text-ink-muted">Nuevo horario: </span>
              <span
                class="tabular-nums"
                :class="nuevo.hora ? 'font-semibold text-ink' : 'text-ink-muted'"
                aria-live="polite"
              >
                {{ resumenNuevo }}
              </span>
            </div>

            <BaseFormError v-if="mensajeGuardar" class="mt-4">{{ mensajeGuardar }}</BaseFormError>

            <div class="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <BaseButton variant="ghost" :disabled="guardando" @click="cerrarEditor()">No cambiar</BaseButton>
              <BaseButton type="submit" :loading="guardando">Guardar nuevo horario</BaseButton>
            </div>
          </form>
        </li>
      </ul>
    </section>

    <!-- Visitas que ya pasaron: solo para consultar, sin cambiar ni cancelar -->
    <section v-if="anteriores.length" aria-labelledby="mi-cita-anteriores" class="mt-12">
      <h2 id="mi-cita-anteriores" class="text-title text-ink">Visitas anteriores</h2>
      <ul class="mt-4 divide-y divide-line rounded-md border border-line bg-surface">
        <li
          v-for="cita in anteriores"
          :key="cita.codigoCita"
          class="flex flex-col gap-0.5 px-4 py-3 text-small sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
        >
          <p class="text-ink">
            <span class="inline-block font-semibold first-letter:uppercase">{{ cita.dia.completo }}</span>
            <span class="text-ink-muted tabular-nums">, {{ cita.horaTexto }}</span>
          </p>
          <p class="text-ink-muted">
            {{ cita.tipo }} · <span class="tracking-wide tabular-nums">{{ cita.codigoCita }}</span>
          </p>
        </li>
      </ul>
    </section>

    <BaseConfirmDialog
      :open="Boolean(porCancelar)"
      :title="tituloDialogo"
      confirm-label="Sí, cancelar visita"
      cancel-label="No, mantenerla"
      :loading="cancelando"
      @confirm="confirmarCancelacion"
      @close="cerrarDialogo"
    >
      <p v-if="porCancelar">
        {{ porCancelar.tipo }} a las {{ porCancelar.horaTexto }} · código <span class="whitespace-nowrap">{{ porCancelar.codigoCita }}</span>.
        Si después quieres venir, tendrás que agendar otra visita.
      </p>
      <template #error>
        <BaseFormError v-if="mensajeCancelar" class="mt-4">{{ mensajeCancelar }}</BaseFormError>
      </template>
    </BaseConfirmDialog>
  </div>
</template>
