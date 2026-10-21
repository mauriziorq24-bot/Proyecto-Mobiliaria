<script setup>
import {
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Copy,
  Info,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShowroomInfo from '../components/layout/ShowroomInfo.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseFormError from '../components/ui/BaseFormError.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import { company } from '../config/empresa'
import { useAsync } from '../composables/useAsync'
import { useToast } from '../composables/useToast'
import { crearCita, ERRORES_CITA } from '../services/citaService'
import { submitErrorMessage } from '../services/errorMessages'
import { obtenerProductoPorId } from '../services/productoService'
import { useAuthStore } from '../stores/auth'
import { borrarBorradorCita, guardarBorradorCita, tomarBorradorCita } from '../utils/borradorCita'
import { descargarIcs } from '../utils/calendario'
import {
  ahoraEnCaracas,
  describirDia,
  diasDisponibles,
  esHorarioDisponible,
  formatearFechaHora,
  formatearHora,
  horariosDelDia,
} from '../utils/fecha'
import { etiquetaTipoAsesoria, OPCIONES_TIPO_ASESORIA } from '../utils/formato'
import { isTokenExpired } from '../utils/jwt'
import { esTelefonoValido } from '../utils/telefono'

// Agendar una visita o asesoría en el showroom (DESIGN.md › Agendar visita).
// La ruta exige sesión porque POST /api/v1/citas exige token (pendiente 10-quater de API.md).

// Mismo criterio que el registro: el backend no revisa el formato del correo.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const form = reactive({
  tipoAsesoria: OPCIONES_TIPO_ASESORIA[0].valor, // "Visita al showroom", la primera de la lista
  fecha: '', // 'AAAA-MM-DD'
  hora: '', // 'HH:MM', hora de Caracas
  nombreCliente: '',
  empresa: '',
  telefono: '',
  email: '',
  notas: '',
})
const errors = reactive({ fecha: '', hora: '', nombreCliente: '', telefono: '', email: '' })

// --- Días y horas ---
// "Ahora" se actualiza cada minuto: si el formulario queda abierto, un turno que ya pasó desaparece.
const ahora = shallowRef(ahoraEnCaracas())
let relojTimer = null

const dias = computed(() => diasDisponibles(undefined, ahora.value))
const horas = computed(() => (form.fecha ? horariosDelDia(form.fecha, ahora.value) : []))

// La tira se agrupa por mes para poner el nombre ("Noviembre") donde cambia.
const meses = computed(() => {
  const grupos = []
  for (const fecha of dias.value) {
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
    { nombre: 'Mañana', horas: horas.value.filter((hora) => hora < '12:00') },
    { nombre: 'Tarde', horas: horas.value.filter((hora) => hora >= '12:00') },
  ].filter((franja) => franja.horas.length),
)

// --- Validación (igual que en el registro) ---
// Cada regla devuelve el mensaje de error, o '' si el campo está bien. El orden es el de la página:
// así el foco va al primer campo con error.
const rules = {
  fecha(value) {
    if (!value) return 'Elige un día para tu visita.'
    if (!dias.value.includes(value)) return 'Ese día ya no está disponible. Elige otro.'
    return ''
  },
  hora(value) {
    if (!form.fecha) return '' // el error ya está en el día
    if (!value) return 'Elige una hora.'
    if (!esHorarioDisponible(form.fecha, value, ahora.value)) return 'Esa hora ya pasó. Elige otra.'
    return ''
  },
  nombreCliente(value) {
    return value.trim() ? '' : 'Escribe tu nombre.'
  },
  telefono(value) {
    if (!value.trim()) return 'Escribe un teléfono para confirmar tu visita.'
    if (!esTelefonoValido(value)) return 'Revisa el teléfono: debe ser venezolano, como 0424-1234567.'
    return ''
  },
  email(value) {
    const email = value.trim()
    if (!email) return 'Escribe tu correo.'
    if (!EMAIL_FORMAT.test(email)) return 'Revisa el correo: debe verse como nombre@ejemplo.com.'
    return ''
  },
}
const fields = Object.keys(rules)

// Antes del primer envío no se marcan errores; después, cada campo se revisa al salir de él.
const attempted = ref(false)

function validateField(field) {
  errors[field] = rules[field](form[field])
}

function handleBlur(field) {
  if (attempted.value) validateField(field)
}

// Día y hora son grupos de botones: su "blur" es cuando el foco sale del grupo entero,
// no cuando pasa de un día a otro con las flechas.
function handleGroupFocusout(field, event) {
  if (!event.currentTarget.contains(event.relatedTarget)) handleBlur(field)
}

function focusField(field) {
  if (field === 'fecha') {
    const radios = document.querySelectorAll('input[name="cita-fecha"]')
    ;([...radios].find((radio) => radio.checked) ?? radios[0])?.focus()
    return
  }
  if (field === 'hora') {
    const botones = document.querySelectorAll('[data-hora]')
    const boton = [...botones].find((b) => b.getAttribute('aria-pressed') === 'true') ?? botones[0]
    if (boton) boton.focus()
    else focusField('fecha')
    return
  }
  document.getElementById(`cita-${field}`)?.focus()
}

// Cambiar de día borra la hora: la de otro día podría no existir en este.
function handleDayChange(event) {
  form.hora = ''
  errors.hora = ''
  if (attempted.value) validateField('fecha')
  event.target.closest('label')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: scrollBehavior() })
}

function selectHora(hora) {
  form.hora = hora
  if (attempted.value) validateField('hora')
}

// Si pasa el tiempo y el día o la hora elegidos dejan de existir, se quitan y se avisa.
watch(dias, (lista) => {
  if (form.fecha && !lista.includes(form.fecha)) {
    form.fecha = ''
    form.hora = ''
    errors.fecha = 'El día que elegiste ya no está disponible. Elige otro.'
  }
})
watch(horas, (lista) => {
  if (form.hora && !lista.includes(form.hora)) {
    form.hora = ''
    errors.hora = 'La hora que elegiste ya pasó. Elige otra.'
  }
})

// --- Tira de días: botones anterior/siguiente (escritorio) ---
const strip = useTemplateRef('strip')
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

// --- Prellenado ---
// 1) Un borrador guardado al vencer la sesión (lo más reciente que escribió la persona).
const borrador = tomarBorradorCita(auth.usuario?.username)
const restoredNotice = ref('')

if (borrador) {
  for (const key of Object.keys(form)) {
    if (typeof borrador[key] === 'string') form[key] = borrador[key]
  }
  if (!OPCIONES_TIPO_ASESORIA.some((opcion) => opcion.valor === form.tipoAsesoria)) {
    form.tipoAsesoria = OPCIONES_TIPO_ASESORIA[0].valor
  }

  // El día o la hora pudieron pasar mientras la persona volvía a ingresar.
  let horarioPerdido = false
  if (form.fecha && !dias.value.includes(form.fecha)) {
    horarioPerdido = true
    form.fecha = ''
    form.hora = ''
  } else if (form.hora && !horas.value.includes(form.hora)) {
    horarioPerdido = true
    form.hora = ''
  }
  restoredNotice.value = horarioPerdido
    ? 'Recuperamos lo que habías escrito, pero el horario que elegiste ya no está disponible. Elige otro.'
    : 'Recuperamos lo que habías escrito. Revisa los datos y agenda tu visita.'
}

// 2) Los datos de la cuenta.
// TODO: cuando exista GET /auth/v1/me (pendiente 5 de API.md), completar nombre y correo con
// los datos reales de la cuenta. Hoy el JWT solo trae el nombre de usuario: si tiene forma de
// correo, se usa en el campo de correo.
const username = auth.usuario?.username ?? ''
if (!form.email && EMAIL_FORMAT.test(username)) form.email = username

// 3) ?producto=ID: el producto desde el que llegó la persona. Si no existe o falla, se ignora.
const { data: producto, execute: cargarProducto } = useAsync((id) => obtenerProductoPorId(id), { immediate: false })

if (typeof route.query.producto === 'string') {
  cargarProducto(route.query.producto).then((resultado) => {
    if (resultado && !form.notas.trim()) form.notas = `Me interesa: ${resultado.nombre}.`
  })
}

// --- Envío ---
// useAsync activa el aviso "Estamos despertando el servidor…" si Render tarda más de 5 s.
const { loading, error, execute } = useAsync((datos) => crearCita(datos), { immediate: false })

const serverError = computed(() => {
  if (!error.value) return ''
  if (error.value.code === ERRORES_CITA.DATOS_INVALIDOS) return error.value.message
  return submitErrorMessage(error.value, 'agendar tu visita')
})

// La cita creada: { codigoCita, fecha, hora, tipoAsesoria }. Con ella se muestra la confirmación.
const cita = ref(null)
const successHeading = useTemplateRef('successHeading')

// Sesión vencida: se guarda lo escrito, se cierra la sesión y se lleva al login.
// Al volver (el login respeta ?redirect=), el borrador se recupera arriba.
function handleSessionExpired(usuario, returnPath) {
  guardarBorradorCita(usuario, { ...form })
  if (auth.token) auth.logout()
  toast.show('Tu sesión venció. Ingresa de nuevo: guardamos lo que escribiste.', 6000)
  // Si el 401 ya llevó al login (main.js), no se navega otra vez.
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login', query: { redirect: returnPath } })
  }
}

async function handleSubmit() {
  // Un segundo envío crearía dos citas iguales.
  if (loading.value) return
  attempted.value = true
  ahora.value = ahoraEnCaracas() // revisar el horario contra la hora de este momento
  fields.forEach(validateField)

  const firstInvalid = fields.find((field) => errors[field])
  if (firstInvalid) {
    error.value = null // el error del envío anterior ya no aplica
    focusField(firstInvalid)
    return
  }

  // Se capturan antes de esperar: si la sesión vence, el usuario y la ruta ya no estarán.
  const usuario = auth.usuario?.username ?? null
  const returnPath = route.fullPath

  // El token pudo vencer mientras la persona llenaba el formulario: no vale la pena enviarlo.
  if (!auth.token || isTokenExpired(auth.token)) {
    handleSessionExpired(usuario, returnPath)
    return
  }

  const datos = { ...form }
  const resultado = await execute(datos)

  if (!error.value) {
    borrarBorradorCita()
    cita.value = { codigoCita: resultado.codigoCita, fecha: datos.fecha, hora: datos.hora, tipoAsesoria: datos.tipoAsesoria }
    window.scrollTo({ top: 0 })
    await nextTick()
    successHeading.value?.focus()
    return
  }

  if (error.value.code === ERRORES_CITA.SESION_VENCIDA) {
    error.value = null
    handleSessionExpired(usuario, returnPath)
    return
  }

  if (error.value.code === ERRORES_CITA.DATOS_INVALIDOS) {
    // Con `campos`, el servicio dice qué falló. Sin ellos es un 400 del backend, que no lo dice:
    // lo más probable es que el turno haya pasado, así que se vuelve a revisar todo.
    ahora.value = ahoraEnCaracas()
    fields.forEach(validateField)
    if (error.value.campos?.includes('fechaHora') && !errors.fecha && !errors.hora) {
      errors.hora = 'Ese horario ya no está disponible. Elige otra hora.'
    }
    const invalid = fields.find((field) => errors[field])
    if (invalid) {
      error.value = null // el error ya se ve en su campo
      await nextTick()
      focusField(invalid)
    }
  }
}

// --- Confirmación ---
const copied = ref(false)
let copiedTimer = null

async function copyCode() {
  try {
    await navigator.clipboard.writeText(cita.value.codigoCita)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 2500)
  } catch {
    // Sin permiso para el portapapeles: el código se puede seleccionar a mano (select-all).
  }
}

const resumen = computed(() => ({
  tipo: etiquetaTipoAsesoria(form.tipoAsesoria),
  dia: form.fecha ? describirDia(form.fecha).completo : '',
  hora: form.hora ? formatearHora(form.hora) : '',
}))

onMounted(() => {
  relojTimer = setInterval(() => (ahora.value = ahoraEnCaracas()), 60_000)
  updateStripEdges()
  stripObserver = new ResizeObserver(updateStripEdges)
  if (strip.value) stripObserver.observe(strip.value)
})

onBeforeUnmount(() => {
  clearInterval(relojTimer)
  clearTimeout(copiedTimer)
  stripObserver?.disconnect()
})
</script>

<template>
  <!-- Confirmación: reemplaza al formulario cuando la cita queda creada -->
  <div v-if="cita" class="mx-auto w-full max-w-xl px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
    <section aria-labelledby="cita-ok-title" class="sm:rounded-md sm:border sm:border-line sm:bg-surface sm:p-8">
      <span class="inline-flex size-12 items-center justify-center rounded-full bg-success-bg text-success">
        <CircleCheck class="size-6" aria-hidden="true" />
      </span>
      <h1 id="cita-ok-title" ref="successHeading" tabindex="-1" class="mt-4 text-headline text-ink focus:outline-none">
        Tu visita quedó agendada
      </h1>
      <p class="mt-2 text-ink-muted">
        {{ etiquetaTipoAsesoria(cita.tipoAsesoria) }}: te esperamos el
        <strong class="font-semibold text-ink">{{ formatearFechaHora(cita.fecha, cita.hora) }}</strong>.
      </p>

      <div class="mt-6 rounded-md border border-line bg-ground p-4">
        <p class="text-label text-ink-muted uppercase">Código de tu cita</p>
        <div class="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p class="text-headline font-extrabold tracking-wide text-ink tabular-nums select-all">{{ cita.codigoCita }}</p>
          <BaseButton variant="secondary" size="sm" @click="copyCode">
            <template #icon-left>
              <Check v-if="copied" />
              <Copy v-else />
            </template>
            {{ copied ? 'Copiado' : 'Copiar' }}
          </BaseButton>
        </div>
        <p class="mt-2 text-small text-ink-muted">Guárdalo: lo necesitas para modificar o cancelar tu cita.</p>
        <p class="sr-only" role="status">{{ copied ? 'Código copiado.' : '' }}</p>
      </div>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <BaseButton variant="secondary" class="sm:flex-1" @click="descargarIcs(cita)">
          <template #icon-left><CalendarPlus /></template>
          Agregar a mi calendario
        </BaseButton>
        <BaseButton
          v-if="producto"
          variant="ghost"
          class="sm:flex-1"
          :to="{ name: 'product', params: { id: producto.id } }"
        >
          Volver al producto
        </BaseButton>
        <BaseButton v-else variant="ghost" class="sm:flex-1" to="/">Seguir viendo el catálogo</BaseButton>
      </div>

      <div class="mt-8 border-t border-line pt-6">
        <ShowroomInfo />
      </div>
    </section>
  </div>

  <div v-else class="container-page pt-8 pb-12 sm:pt-12 sm:pb-16">
    <h1 class="text-headline text-ink">Agendar visita</h1>
    <p class="mt-2 max-w-[60ch] text-ink-muted">
      Elige qué necesitas, el día y la hora. Te atendemos en nuestro showroom de {{ company.showroom.address }}.
    </p>

    <p
      v-if="restoredNotice"
      role="status"
      class="mt-6 flex max-w-[70ch] items-start gap-2 rounded-md bg-brand-tint px-3.5 py-3 text-small text-ink"
    >
      <Info class="mt-px size-4 shrink-0 text-brand-deep" aria-hidden="true" />
      {{ restoredNotice }}
    </p>

    <!-- novalidate: los mensajes de error los ponemos nosotros, en español y junto a cada campo.
         En escritorio el formulario es una grilla: los datos a la izquierda y el resumen (con el
         único botón de envío) fijo a la derecha. En móvil, el resumen queda al final. -->
    <form
      novalidate
      class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8"
      @submit.prevent="handleSubmit"
    >
      <div class="flex min-w-0 flex-col divide-y divide-line sm:rounded-md sm:border sm:border-line sm:bg-surface sm:px-8">
        <!-- Tipo de asesoría: radios nativos (flechas y lectores de pantalla funcionan solos) -->
        <!-- El padding va en un div: el navegador dibuja el <legend> sobre el borde del fieldset -->
        <div class="min-w-0 pb-8 sm:pt-8">
        <fieldset class="min-w-0">
          <legend class="text-title text-ink">Tipo de asesoría</legend>
          <div class="mt-4 flex flex-col gap-2">
            <label
              v-for="opcion in OPCIONES_TIPO_ASESORIA"
              :key="opcion.valor"
              class="flex cursor-pointer items-start gap-3 rounded-md border px-4 py-2.5 transition-colors sm:py-3"
              :class="
                form.tipoAsesoria === opcion.valor
                  ? 'border-brand-deep bg-brand-tint'
                  : 'border-line bg-surface hover:border-line-strong'
              "
            >
              <input
                v-model="form.tipoAsesoria"
                type="radio"
                name="cita-tipo"
                :value="opcion.valor"
                :aria-labelledby="`cita-tipo-${opcion.valor}`"
                :aria-describedby="`cita-tipo-${opcion.valor}-desc`"
                class="mt-[3px] size-[18px] shrink-0 accent-brand-deep"
              />
              <span class="min-w-0 flex-1">
                <span :id="`cita-tipo-${opcion.valor}`" class="flex items-center gap-2 font-semibold text-ink">
                  {{ opcion.etiqueta }}
                  <!-- Punto dorado: la visita es lo que lleva al showroom (regla del dorado) -->
                  <span
                    v-if="opcion.valor === 'VISITA_SHOWROOM'"
                    class="size-2 shrink-0 rounded-full bg-showroom-gold"
                    aria-hidden="true"
                  />
                </span>
                <!-- En móvil la descripción ocupa una línea; la elegida se ve completa -->
                <span
                  :id="`cita-tipo-${opcion.valor}-desc`"
                  class="block text-small text-ink-muted"
                  :class="form.tipoAsesoria !== opcion.valor && 'max-sm:truncate'"
                >
                  {{ opcion.descripcion }}
                </span>
              </span>
              <Check
                v-if="form.tipoAsesoria === opcion.valor"
                class="mt-0.5 size-[18px] shrink-0 text-brand-deep"
                aria-hidden="true"
              />
            </label>
          </div>
        </fieldset>
        </div>

        <section aria-labelledby="cita-horario-title" class="min-w-0 py-8">
          <div class="flex items-center justify-between gap-4">
            <h2 id="cita-horario-title" class="text-title text-ink">Día y hora</h2>

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
            :aria-describedby="errors.fecha ? 'cita-fecha-message' : undefined"
            @focusout="handleGroupFocusout('fecha', $event)"
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
                  <label
                    v-for="dia in mes.dias"
                    :key="dia.fecha"
                    class="relative flex h-[76px] w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
                    :class="
                      form.fecha === dia.fecha
                        ? 'border-brand-deep bg-brand-tint text-brand-deep'
                        : 'border-line bg-surface text-ink hover:border-line-strong'
                    "
                  >
                    <input
                      v-model="form.fecha"
                      type="radio"
                      name="cita-fecha"
                      :value="dia.fecha"
                      class="sr-only"
                      @change="handleDayChange"
                    />
                    <span class="text-small capitalize" aria-hidden="true">{{ dia.diaSemana }}</span>
                    <span class="text-title font-bold tabular-nums" aria-hidden="true">{{ dia.dia }}</span>
                    <span class="sr-only">{{ dia.completo }}</span>
                    <Check
                      v-if="form.fecha === dia.fecha"
                      class="absolute top-1.5 right-1.5 size-3"
                      :stroke-width="3"
                      aria-hidden="true"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div aria-live="polite">
              <p v-if="errors.fecha" id="cita-fecha-message" class="mt-1.5 flex items-start gap-1.5 text-small text-error">
                <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
                {{ errors.fecha }}
              </p>
            </div>
          </fieldset>

          <!-- Hora: botones con aria-pressed -->
          <div
            role="group"
            aria-labelledby="cita-hora-label"
            :aria-describedby="errors.hora ? 'cita-hora-message' : undefined"
            class="mt-6"
            @focusout="handleGroupFocusout('hora', $event)"
          >
            <p id="cita-hora-label" class="mb-1.5 text-small font-semibold text-ink">Hora</p>
            <p v-if="!form.fecha" class="text-small text-ink-muted">Elige un día para ver las horas disponibles.</p>
            <div v-else class="flex flex-col gap-4">
              <div v-for="franja in franjas" :key="franja.nombre" role="group" :aria-label="franja.nombre">
                <p class="mb-2 text-small text-ink-muted" aria-hidden="true">{{ franja.nombre }}</p>
                <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                  <button
                    v-for="hora in franja.horas"
                    :key="hora"
                    type="button"
                    :data-hora="hora"
                    :aria-pressed="form.hora === hora"
                    class="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border px-2 text-small font-semibold whitespace-nowrap tabular-nums transition-colors"
                    :class="
                      form.hora === hora
                        ? 'border-brand-deep bg-brand-tint text-brand-deep'
                        : 'border-line bg-surface text-ink hover:border-line-strong'
                    "
                    @click="selectHora(hora)"
                  >
                    <Check v-if="form.hora === hora" class="size-3.5 shrink-0" :stroke-width="3" aria-hidden="true" />
                    {{ formatearHora(hora) }}
                  </button>
                </div>
              </div>
            </div>

            <div aria-live="polite">
              <p v-if="errors.hora" id="cita-hora-message" class="mt-1.5 flex items-start gap-1.5 text-small text-error">
                <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
                {{ errors.hora }}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="cita-datos-title" class="flex min-w-0 flex-col gap-4 pt-8 sm:pb-8">
          <h2 id="cita-datos-title" class="text-title text-ink">Tus datos</h2>

          <BaseInput
            id="cita-nombreCliente"
            v-model="form.nombreCliente"
            label="Nombre y apellido"
            :error="errors.nombreCliente"
            autocomplete="name"
            @blur="handleBlur('nombreCliente')"
          />

          <BaseInput
            id="cita-empresa"
            v-model="form.empresa"
            label="Empresa o negocio (opcional)"
            autocomplete="organization"
          />

          <div class="grid gap-4 sm:grid-cols-2">
            <BaseInput
              id="cita-telefono"
              v-model="form.telefono"
              type="tel"
              label="Teléfono"
              hint="Fijo o celular, p. ej. 0424-1234567."
              :error="errors.telefono"
              autocomplete="tel"
              inputmode="tel"
              @blur="handleBlur('telefono')"
            />
            <BaseInput
              id="cita-email"
              v-model="form.email"
              type="email"
              label="Correo"
              :error="errors.email"
              autocomplete="email"
              spellcheck="false"
              @blur="handleBlur('email')"
            />
          </div>

          <div class="flex flex-col">
            <label for="cita-notas" class="mb-1.5 text-small font-semibold text-ink">Notas (opcional)</label>
            <textarea
              id="cita-notas"
              v-model="form.notas"
              rows="3"
              aria-describedby="cita-notas-hint"
              class="min-h-24 w-full resize-y rounded-md border border-line-strong bg-surface px-3.5 py-3 text-base text-ink transition-[border-color,box-shadow] duration-200 ease-out hover:border-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none focus-visible:outline-none"
            />
            <p id="cita-notas-hint" class="mt-1.5 text-small text-ink-muted">
              Cuéntanos qué quieres ver o para qué espacio es: oficina, negocio o casa.
            </p>
          </div>
        </section>
      </div>

      <!-- Resumen + el único botón de envío. En escritorio queda fijo al hacer scroll. -->
      <aside aria-labelledby="cita-resumen-title" class="lg:sticky lg:top-24">
        <div class="rounded-md border border-line bg-surface p-5 sm:p-6">
          <h2 id="cita-resumen-title" class="text-title text-ink">Tu visita</h2>

          <dl class="mt-3 divide-y divide-line text-small">
            <div class="flex justify-between gap-4 py-2.5">
              <dt class="text-ink-muted">Asesoría</dt>
              <dd class="text-right font-semibold text-ink">{{ resumen.tipo }}</dd>
            </div>
            <div class="flex justify-between gap-4 py-2.5">
              <dt class="text-ink-muted">Día</dt>
              <dd class="text-right" :class="resumen.dia ? 'font-semibold text-ink first-letter:uppercase' : 'text-ink-muted'">
                {{ resumen.dia || 'Elige un día' }}
              </dd>
            </div>
            <div class="flex justify-between gap-4 py-2.5">
              <dt class="text-ink-muted">Hora</dt>
              <dd class="text-right tabular-nums" :class="resumen.hora ? 'font-semibold text-ink' : 'text-ink-muted'">
                {{ resumen.hora || (resumen.dia ? 'Elige una hora' : '—') }}
              </dd>
            </div>
            <div class="flex justify-between gap-4 py-2.5">
              <dt class="text-ink-muted">Lugar</dt>
              <dd class="text-right text-ink">{{ company.showroom.address }}</dd>
            </div>
            <div v-if="producto" class="flex items-center gap-3 py-2.5">
              <dt class="sr-only">Producto de interés</dt>
              <dd class="flex min-w-0 items-center gap-3">
                <img
                  :src="producto.imagenes?.[0] || '/placeholder-producto.svg'"
                  alt=""
                  width="72"
                  height="90"
                  class="aspect-[4/5] w-10 shrink-0 rounded-sm border border-line object-cover object-center"
                />
                <span class="min-w-0">
                  <span class="block text-ink-muted">Te interesa</span>
                  <span class="line-clamp-2 font-semibold text-ink">{{ producto.nombre }}</span>
                </span>
              </dd>
            </div>
          </dl>

          <BaseFormError v-if="serverError" class="mt-4">{{ serverError }}</BaseFormError>

          <BaseButton type="submit" variant="visit" size="lg" block :loading="loading" class="mt-5">
            <template #icon-left><CalendarCheck /></template>
            Agendar visita
          </BaseButton>
          <p class="mt-3 text-small text-ink-muted">
            Al agendar recibirás un código para modificar o cancelar tu cita.
          </p>
        </div>
      </aside>
    </form>
  </div>
</template>
