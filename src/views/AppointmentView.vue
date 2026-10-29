<script setup>
import { CalendarCheck, Check, Info } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppointmentSlotPicker from '../components/appointment/AppointmentSlotPicker.vue'
import LegalNotice from '../components/legal/LegalNotice.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseFormError from '../components/ui/BaseFormError.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BasePhoneInput from '../components/ui/BasePhoneInput.vue'
import { company } from '../config/empresa'
import { useAsync } from '../composables/useAsync'
import { useToast } from '../composables/useToast'
import { crearCita, ERRORES_CITA } from '../services/citaService'
import { submitErrorMessage } from '../services/errorMessages'
import { obtenerProductoPorId } from '../services/productoService'
import { useAuthStore } from '../stores/auth'
import { borrarBorradorCita, guardarBorradorCita, tomarBorradorCita } from '../utils/borradorCita'
import { guardarCita } from '../utils/citasGuardadas'
import {
  ahoraEnCaracas,
  describirDia,
  diasDisponibles,
  esHorarioDisponible,
  formatearHora,
  horariosDelDia,
} from '../utils/fecha'
import { etiquetaTipoAsesoria, OPCIONES_TIPO_ASESORIA } from '../utils/formato'
import { isTokenExpired } from '../utils/jwt'
import { PAIS_POR_DEFECTO, validarTelefono } from '../utils/telefono'

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
  paisTelefono: PAIS_POR_DEFECTO, // 'VE', 'CO'…: el país del selector del teléfono
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
const slotPicker = useTemplateRef('slotPicker')

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
    return validarTelefono(value, form.paisTelefono)
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

// Con otro país, el mismo número puede pasar a ser válido (o dejar de serlo).
watch(
  () => form.paisTelefono,
  () => handleBlur('telefono'),
)

function focusField(field) {
  if (field === 'fecha') slotPicker.value?.focusDay()
  else if (field === 'hora') slotPicker.value?.focusHour()
  else document.getElementById(`cita-${field}`)?.focus()
}

// El selector borra la hora al cambiar de día (llega hora = ''): ahí se limpia también su error.
function selectDay(fecha) {
  form.fecha = fecha
  if (attempted.value) validateField('fecha')
}

function selectHora(hora) {
  form.hora = hora
  if (hora) {
    if (attempted.value) validateField('hora')
  } else {
    errors.hora = ''
  }
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
    // Se guarda con todos sus datos (los mismos que se enviaron): la confirmación los lee de ahí,
    // así recargarla no crea otra cita, y el paso 6F los necesita para reprogramar con PUT.
    // Con el usuario de la sesión: /mi-cita y /perfil muestran solo las de esa cuenta.
    guardarCita({ codigoCita: resultado.codigoCita, ...resultado.enviada }, usuario)
    // replace: "Atrás" desde la confirmación no vuelve a un formulario ya enviado.
    router.replace({
      name: 'appointment-confirmation',
      query: { codigo: resultado.codigoCita, ...(producto.value && { producto: String(producto.value.id) }) },
    })
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

// --- Resumen "Tu visita" ---
const resumen = computed(() => ({
  tipo: etiquetaTipoAsesoria(form.tipoAsesoria),
  dia: form.fecha ? describirDia(form.fecha).completo : '',
  hora: form.hora ? formatearHora(form.hora) : '',
}))

onMounted(() => {
  relojTimer = setInterval(() => (ahora.value = ahoraEnCaracas()), 60_000)
})

onBeforeUnmount(() => clearInterval(relojTimer))
</script>

<template>
  <div class="container-page pt-8 pb-12 sm:pt-12 sm:pb-16">
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
                  : 'border-line-strong bg-surface hover:border-ink-muted'
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
          <AppointmentSlotPicker
            ref="slotPicker"
            :fecha="form.fecha"
            :hora="form.hora"
            :dias="dias"
            :horas="horas"
            :error-fecha="errors.fecha"
            :error-hora="errors.hora"
            @update:fecha="selectDay"
            @update:hora="selectHora"
            @leave="handleBlur"
          >
            <template #title>
              <h2 id="cita-horario-title" class="text-title text-ink">Día y hora</h2>
            </template>
          </AppointmentSlotPicker>
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
            <BasePhoneInput
              id="cita-telefono"
              v-model="form.telefono"
              v-model:pais="form.paisTelefono"
              label="Teléfono"
              hint="Fijo o celular. Si es de otro país, elige su código."
              :error="errors.telefono"
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

      <!-- Resumen + el único botón de envío. En escritorio queda fijo al hacer scroll,
           salvo en pantallas bajas (short): ahí el botón quedaría fuera de la vista. -->
      <aside aria-labelledby="cita-resumen-title" class="lg:sticky lg:top-24 lg:short:static">
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
          <LegalNotice action="agendar tu visita" class="mt-2" />
        </div>
      </aside>
    </form>
  </div>
</template>
