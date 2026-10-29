<script setup>
import { CalendarCheck, LoaderCircle, MessageCircle, RotateCw, Send, Trash2, TriangleAlert, Undo2 } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, reactive, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuoteLineItem from '../components/cart/QuoteLineItem.vue'
import QuoteMobileBar from '../components/cart/QuoteMobileBar.vue'
import LegalNotice from '../components/legal/LegalNotice.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseConfirmDialog from '../components/ui/BaseConfirmDialog.vue'
import BaseFormError from '../components/ui/BaseFormError.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BasePhoneInput from '../components/ui/BasePhoneInput.vue'
import { company } from '../config/empresa'
import { useAsync } from '../composables/useAsync'
import { useToast } from '../composables/useToast'
import { cotizacionApiActiva, ERRORES_COTIZACION, solicitarCotizacion } from '../services/cotizacionService'
import { submitErrorMessage } from '../services/errorMessages'
import { obtenerProductos } from '../services/productoService'
import { useAuthStore } from '../stores/auth'
import { useCotizacionStore } from '../stores/cotizacion'
import { guardarCotizacionEnviada } from '../utils/cotizacionesEnviadas'
import { formatearPrecio } from '../utils/formato'
import { setPageTitle } from '../utils/pageTitle'
import { PAIS_POR_DEFECTO, validarTelefono } from '../utils/telefono'
import { cotizacionUrl } from '../utils/whatsapp'

// Mi cotización (el "carrito"): revisar la lista y enviarla (DESIGN.md › Mi cotización).
// Con VITE_COTIZACION_API=false se envía solo por WhatsApp; con true, también con el formulario.

const cotizacion = useCotizacionStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const heading = useTemplateRef('heading')

// --- Título de la pestaña: "Mi cotización (3)" ---
watch(
  () => cotizacion.totalUnidades,
  (unidades) => {
    if (route.name !== 'cart') return
    setPageTitle(unidades ? `Mi cotización (${unidades})` : 'Mi cotización')
  },
  { immediate: true },
)

// --- Poner la lista al día con el catálogo ---
// Una sola petición (GET /api/v1/productos, sin filtros: el catálogo completo, como pide reconciliar).
// Mientras llega, la lista se muestra con la copia guardada; lo que ya no exista queda marcado.
// Con la lista vacía no se pide nada: no hay nada que revisar.
const {
  loading: revisando,
  error: errorCatalogo,
  execute: cargarCatalogo,
} = useAsync(() => obtenerProductos(), { immediate: false })

async function revisarCatalogo() {
  const productos = await cargarCatalogo()
  if (productos) cotizacion.reconciliar(productos)
}

if (cotizacion.items.length) revisarCatalogo()

// --- Totales ---
const totalTexto = computed(() => formatearPrecio(cotizacion.totalReferencial))
const lineasDisponibles = computed(() => cotizacion.itemsDisponibles.length)
const noDisponibles = computed(() => cotizacion.items.length - lineasDisponibles.value)
const puedeEnviar = computed(() => lineasDisponibles.value > 0)

const whatsappLink = computed(() => cotizacionUrl(cotizacion.itemsDisponibles, totalTexto.value))

// --- Quitar con "Deshacer" ---
// El producto sale del store al instante (el total baja), y en su lugar queda unos segundos una
// fila "Producto quitado · Deshacer". El aviso va en la propia lista y no en el aviso flotante:
// así quien usa teclado lo tiene justo donde estaba, con el foco ya en "Deshacer".
// Mientras el puntero o el foco están en la fila, no se va (como AppToast).
const DESHACER_MS = 6000

const quitados = ref([]) // [{ id, item, indice }]
const timers = new Map() // id → timeout
let ultimoId = 0

// Lo que lee el lector de pantalla tras quitar o deshacer.
const anuncio = ref('')

// Filas a dibujar: los items del store y, en el lugar que tenían, los quitados que aún se pueden deshacer.
// Cada quitado va justo antes del item que hoy ocupa su posición (o al final).
const filas = computed(() => {
  const lista = cotizacion.items.map((item) => ({ key: `item-${item.productoId}`, item }))
  for (const quitado of quitados.value) {
    let posicion = lista.length
    let items = 0
    for (let i = 0; i < lista.length; i++) {
      if (!lista[i].item) continue
      if (items === quitado.indice) {
        posicion = i
        break
      }
      items++
    }
    lista.splice(posicion, 0, { key: `quitado-${quitado.id}`, quitado })
  }
  return lista
})

function programarCierre(id) {
  clearTimeout(timers.get(id))
  timers.set(id, setTimeout(() => cerrarQuitado(id), DESHACER_MS))
}

function pausarCierre(id) {
  clearTimeout(timers.get(id))
}

// Al quitar, el foco pasa a "Deshacer" también si se usó el mouse. Solo el foco de teclado
// (:focus-visible) detiene el cierre: con el mouse la fila se va a los 6 s, como se espera.
function pausarSiEsTeclado(event, id) {
  if (event.target.matches(':focus-visible')) pausarCierre(id)
}

function cerrarQuitado(id) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  // Si el foco estaba en esa fila, no se pierde: pasa al título.
  const teniaFoco = document.getElementById(`quitado-${id}`)?.contains(document.activeElement)
  quitados.value = quitados.value.filter((quitado) => quitado.id !== id)
  // preventScroll: la fila se cierra sola; mover la página hacia el título sorprendería.
  if (teniaFoco) nextTick(() => heading.value?.focus({ preventScroll: true }))
}

function quitarItem(item) {
  const quitado = cotizacion.quitar(item.productoId)
  if (!quitado) return
  const id = ++ultimoId
  quitados.value = [...quitados.value, { id, ...quitado }]
  programarCierre(id)
  anuncio.value = `Quitaste ${item.producto.nombre} de tu cotización.`
  nextTick(() => document.getElementById(`deshacer-${id}`)?.focus())
}

function deshacer(quitado) {
  clearTimeout(timers.get(quitado.id))
  timers.delete(quitado.id)
  quitados.value = quitados.value.filter((q) => q.id !== quitado.id)
  cotizacion.restaurar(quitado)
  anuncio.value = `Volviste a agregar ${quitado.item.producto.nombre}.`
  nextTick(() => document.getElementById(`linea-${quitado.item.productoId}`)?.focus())
}

function limpiarQuitados() {
  timers.forEach(clearTimeout)
  timers.clear()
  quitados.value = []
}

onBeforeUnmount(() => timers.forEach(clearTimeout))

// --- Vaciar (con confirmación) ---
// Enviar por WhatsApp no vacía la lista (no sabemos si la persona llegó a enviar el mensaje):
// para empezar de nuevo está este botón, lejos de los de enviar.
const confirmandoVaciar = ref(false)

function vaciar() {
  cotizacion.vaciar()
  limpiarQuitados()
  confirmandoVaciar.value = false
  toast.show('Vaciamos tu cotización.')
  nextTick(() => heading.value?.focus())
}

// --- Formulario de solicitud (solo con VITE_COTIZACION_API=true) ---
// Mismo criterio que el formulario de citas: el backend no revisa el formato del correo.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// paisTelefono: el país del selector del teléfono ('VE', 'CO'…).
const form = reactive({ nombreCliente: '', empresa: '', telefono: '', paisTelefono: PAIS_POR_DEFECTO, email: '', notas: '' })
const errors = reactive({ nombreCliente: '', telefono: '', email: '' })

// TODO: cuando exista GET /auth/v1/me (pendiente 5 de API.md), completar nombre y correo con los datos
// de la cuenta. Hoy el JWT solo trae el nombre de usuario: si tiene forma de correo, se usa.
const username = auth.usuario?.username ?? ''
if (EMAIL_FORMAT.test(username)) form.email = username

// Cada regla devuelve el mensaje de error, o '' si está bien. En el orden de la página: el foco va al primero.
const rules = {
  nombreCliente(value) {
    return value.trim() ? '' : 'Escribe tu nombre.'
  },
  telefono(value) {
    if (!value.trim()) return 'Escribe un teléfono para enviarte la cotización.'
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

// "Solicitar cotización" del resumen: lleva al formulario y pone el foco en el primer campo.
const solicitud = useTemplateRef('solicitud')

function irAlFormulario() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  solicitud.value?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  document.getElementById('cot-nombreCliente')?.focus({ preventScroll: true })
}

// useAsync activa el aviso "Estamos despertando el servidor…" si Render tarda más de 5 s.
const {
  loading: enviando,
  error: errorEnvio,
  execute: enviar,
} = useAsync((datos, items) => solicitarCotizacion(datos, items), { immediate: false })

// Mensaje de un 400 cuando averiguamos qué producto falló (ver explicarDatosInvalidos).
const errorProductos = ref('')
// Mientras se averigua, el botón sigue "enviando": la solicitud todavía no tiene respuesta clara.
const revisandoError = ref(false)

const serverError = computed(() => {
  if (errorProductos.value) return errorProductos.value
  if (!errorEnvio.value) return ''
  if (errorEnvio.value.code === ERRORES_COTIZACION.DATOS_INVALIDOS) return errorEnvio.value.message
  // Red o servidor: no se borra nada de lo escrito ni de la lista; basta con volver a enviar.
  return submitErrorMessage(errorEnvio.value, 'enviar tu solicitud')
})

const listaEnTexto = new Intl.ListFormat('es', { type: 'conjunction' })

function focusField(field) {
  document.getElementById(`cot-${field}`)?.focus()
}

// El backend responde 400 sin decir qué falló (API.md). Puede ser:
// 1. Un producto que ya no existe: se vuelve a revisar el catálogo y se nombra.
// 2. Un dato del formulario: se revisan los campos y el foco va al primero con error.
// Si no se logra saber, queda el mensaje general del servicio.
async function explicarDatosInvalidos() {
  const { campos = [] } = errorEnvio.value
  if (!campos.length) {
    revisandoError.value = true
    const productos = await cargarCatalogo()
    revisandoError.value = false
    const perdidos = productos ? cotizacion.reconciliar(productos) : []
    if (perdidos.length) {
      const nombres = listaEnTexto.format(perdidos.map((item) => item.producto.nombre))
      errorProductos.value =
        perdidos.length === 1
          ? `Ya no está disponible: ${nombres}. Lo marcamos en tu lista y no se enviará: vuelve a enviar tu solicitud.`
          : `Ya no están disponibles: ${nombres}. Los marcamos en tu lista y no se enviarán: vuelve a enviar tu solicitud.`
      errorEnvio.value = null
      // Si no queda nada que enviar, el formulario se oculta con su mensaje: se anuncia aparte.
      if (!puedeEnviar.value) anuncio.value = errorProductos.value
      return
    }
  }

  fields.forEach(validateField)
  const invalid = fields.find((field) => errors[field])
  if (invalid) {
    errorEnvio.value = null // el error ya se ve en su campo
    await nextTick()
    focusField(invalid)
  }
}

async function handleSubmit() {
  // Un segundo envío crearía dos solicitudes iguales.
  if (enviando.value || revisandoError.value || !puedeEnviar.value) return
  attempted.value = true
  errorProductos.value = ''
  fields.forEach(validateField)

  const firstInvalid = fields.find((field) => errors[field])
  if (firstInvalid) {
    errorEnvio.value = null // el error del envío anterior ya no aplica
    focusField(firstInvalid)
    return
  }

  // Se copian antes de esperar: la lista podría cambiar desde otra pestaña mientras se envía.
  const items = cotizacion.itemsDisponibles.map((item) => ({ ...item }))
  const totalReferencial = cotizacion.totalReferencial
  const username = auth.usuario?.username ?? null
  const resultado = await enviar({ ...form }, items)
  if (errorEnvio.value) {
    if (errorEnvio.value.code === ERRORES_COTIZACION.DATOS_INVALIDOS) await explicarDatosInvalidos()
    return
  }

  // Aquí sí se vacía: sabemos que la solicitud llegó. La confirmación lee esta copia, así que
  // recargarla no reenvía nada. Con el usuario de la sesión, si hay: así aparece en su perfil
  // (enviada sin sesión, no aparece en el perfil de nadie).
  guardarCotizacionEnviada(
    {
      codigoCotizacion: resultado.codigoCotizacion,
      items: items.map(({ productoId, cantidad, producto }) => ({
        productoId,
        cantidad,
        nombre: producto.nombre,
        precioReferencialUsd: producto.precioReferencialUsd,
      })),
      totalReferencial,
    },
    username,
  )
  cotizacion.vaciar()
  // replace: "Atrás" desde la confirmación no vuelve a un formulario ya enviado.
  router.replace({ name: 'quote-confirmation', query: { codigo: resultado.codigoCotizacion } })
}
</script>

<template>
  <div class="container-page pt-8 pb-12 sm:pt-12 sm:pb-16">
    <h1 ref="heading" tabindex="-1" class="text-headline text-ink focus:outline-none">Mi cotización</h1>

    <!-- Vacía -->
    <div v-if="!filas.length" class="mt-6 max-w-3xl rounded-md border border-line bg-surface px-5 py-8 sm:px-8 sm:py-10">
      <h2 class="text-title text-ink">Tu cotización está vacía</h2>
      <p class="mt-2 max-w-[55ch] text-ink-muted">
        Agrega los muebles que te interesan, con sus cantidades, y envíanos la lista para recibir el precio final.
      </p>
      <BaseButton to="/buscar" class="mt-6 max-sm:w-full">Ver catálogo</BaseButton>

      <div class="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-card-title text-ink">¿Prefieres verlos en persona?</p>
          <p class="mt-1 text-small text-ink-muted">Ven a nuestro showroom en {{ company.showroom.address }}.</p>
        </div>
        <BaseButton to="/agendar-cita" variant="visit" class="max-sm:w-full">
          <template #icon-left><CalendarCheck /></template>
          Agendar visita
        </BaseButton>
      </div>
    </div>

    <template v-else>
      <p class="mt-2 max-w-[60ch] text-ink-muted">
        Revisa los productos y las cantidades, y envíanos tu lista. Te respondemos con el precio final.
      </p>

      <!-- Si falla, la lista sigue sirviendo con los precios guardados: un aviso, no una pantalla de error -->
      <div
        v-if="errorCatalogo && !revisando"
        role="alert"
        class="mt-4 flex max-w-[70ch] flex-col items-start gap-3 rounded-md bg-warning-bg px-3.5 py-3 text-small text-ink sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="flex items-start gap-2">
          <TriangleAlert class="mt-px size-4 shrink-0 text-warning" aria-hidden="true" />
          No pudimos revisar los precios actuales. Ves los de cuando agregaste cada producto.
        </p>
        <BaseButton variant="secondary" size="sm" class="shrink-0" @click="revisarCatalogo">
          <template #icon-left><RotateCw /></template>
          Reintentar
        </BaseButton>
      </div>

      <!--
        Escritorio: lista (y formulario) a la izquierda; resumen fijo a la derecha.
        Móvil y tablet: lista → "Vaciar" → resumen → barra fija → formulario. La lista, el resumen y la
        barra comparten un bloque (lg:contents lo disuelve en la grilla de escritorio): así la barra
        sticky se detiene al terminar ese bloque y no tapa el formulario.
        La última fila es 1fr: si el resumen mide más que la lista, el espacio sobrante va al final
        y no entre la lista y "Vaciar".
      -->
      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_auto_1fr] lg:gap-x-8">
        <div class="flex min-w-0 flex-col gap-4 lg:contents">
          <section aria-labelledby="cot-productos-title" class="min-w-0 rounded-md border border-line bg-surface px-4 sm:px-6 lg:col-start-1">
            <h2 id="cot-productos-title" class="sr-only">Productos</h2>
            <ul class="divide-y divide-line">
              <template v-for="fila in filas" :key="fila.key">
                <QuoteLineItem
                  v-if="fila.item"
                  :item="fila.item"
                  @update:cantidad="cotizacion.cambiarCantidad(fila.item.productoId, $event)"
                  @remove="quitarItem(fila.item)"
                />
                <li
                  v-else
                  :id="`quitado-${fila.quitado.id}`"
                  class="flex items-center justify-between gap-3 py-3 motion-safe:animate-fade-in"
                  @mouseenter="pausarCierre(fila.quitado.id)"
                  @mouseleave="programarCierre(fila.quitado.id)"
                  @focusin="pausarSiEsTeclado($event, fila.quitado.id)"
                  @focusout="programarCierre(fila.quitado.id)"
                >
                  <p class="min-w-0 text-small">
                    <span class="font-semibold text-ink">Producto quitado</span>
                    <span class="text-ink-muted"> · </span>
                    <span class="text-ink-muted">{{ fila.quitado.item.producto.nombre }}</span>
                  </p>
                  <BaseButton
                    :id="`deshacer-${fila.quitado.id}`"
                    variant="ghost"
                    size="sm"
                    :aria-label="`Deshacer: volver a agregar ${fila.quitado.item.producto.nombre}`"
                    @click="deshacer(fila.quitado)"
                  >
                    <template #icon-left><Undo2 /></template>
                    Deshacer
                  </BaseButton>
                </li>
              </template>
            </ul>
          </section>

          <!-- Acción destructiva: discreta, al final de la lista y lejos de los botones de enviar -->
          <div v-if="cotizacion.items.length" class="flex justify-end lg:col-start-1">
            <button
              type="button"
              class="relative inline-flex items-center gap-1.5 rounded-sm text-small font-semibold text-ink-muted underline underline-offset-4 transition-colors before:absolute before:-inset-x-2 before:-inset-y-3 hover:text-error"
              @click="confirmandoVaciar = true"
            >
              <Trash2 class="size-4" aria-hidden="true" />
              Vaciar mi cotización
            </button>
          </div>

          <!-- Resumen. En escritorio, fijo al hacer scroll salvo en pantallas bajas (short). -->
          <aside
            aria-labelledby="cot-resumen-title"
            class="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start lg:short:static"
          >
            <div class="rounded-md border border-line bg-surface p-5 sm:p-6">
              <!-- Mientras se revisa la lista contra el catálogo, un aviso junto al título: no mueve
                   nada de la página. La región existe siempre para que el lector de pantalla lo anuncie. -->
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h2 id="cot-resumen-title" class="text-title text-ink">Resumen</h2>
                <p role="status" class="text-small text-ink-muted">
                  <span v-if="revisando" class="inline-flex items-center gap-1.5">
                    <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
                    Revisando precios…
                  </span>
                </p>
              </div>

              <dl class="mt-3 divide-y divide-line text-small">
                <div class="flex justify-between gap-4 py-2.5">
                  <dt class="text-ink-muted">Productos</dt>
                  <dd class="font-semibold text-ink tabular-nums">{{ lineasDisponibles }}</dd>
                </div>
                <div class="flex justify-between gap-4 py-2.5">
                  <dt class="text-ink-muted">Unidades</dt>
                  <dd class="font-semibold text-ink tabular-nums">{{ cotizacion.totalUnidades }}</dd>
                </div>
                <div v-if="noDisponibles" class="flex justify-between gap-4 py-2.5">
                  <dt class="text-warning">No disponibles</dt>
                  <dd class="text-right text-ink-muted">
                    <span class="tabular-nums">{{ noDisponibles }}</span>, no suman
                  </dd>
                </div>
              </dl>

              <div class="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <p class="font-semibold text-ink">Total referencial</p>
                <p class="text-price-large text-ink tabular-nums">{{ totalTexto }}</p>
              </div>
              <p class="mt-2 text-small text-ink-muted">
                Es un precio de referencia. El precio final te lo confirmamos al responder tu cotización.
              </p>

              <!-- Ningún producto se puede cotizar: no hay nada que enviar.
                   (Sin items y solo con filas "Producto quitado", tampoco: ahí no hace falta el aviso.) -->
              <div
                v-if="!puedeEnviar && cotizacion.items.length"
                class="mt-5 rounded-md bg-warning-bg px-3.5 py-3 text-small text-ink"
              >
                Ninguno de estos productos sigue disponible. Quítalos y agrega otros desde el
                <RouterLink to="/buscar" class="font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper">
                  catálogo</RouterLink
                >.
              </div>

              <!-- Con formulario: "Solicitar cotización" es lo principal y WhatsApp la alternativa.
                   En móvil y tablet la acción principal está en la barra fija: aquí no se repite. -->
              <template v-else-if="puedeEnviar && cotizacionApiActiva">
                <BaseButton size="lg" block class="mt-5 max-lg:hidden" @click="irAlFormulario">
                  Solicitar cotización
                </BaseButton>
                <p class="mt-4 text-small text-ink-muted max-lg:mt-5">¿Prefieres escribirnos?</p>
                <BaseButton variant="whatsapp" block :href="whatsappLink" target="_blank" rel="noopener" class="mt-2">
                  <template #icon-left><MessageCircle /></template>
                  Enviar por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
                </BaseButton>
              </template>

              <template v-else-if="puedeEnviar">
                <BaseButton
                  variant="whatsapp"
                  size="lg"
                  block
                  :href="whatsappLink"
                  target="_blank"
                  rel="noopener"
                  class="mt-5 max-lg:hidden"
                >
                  <template #icon-left><MessageCircle /></template>
                  Enviar por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
                </BaseButton>
                <p class="mt-3 text-small text-ink-muted">
                  Se abre WhatsApp con tu lista ya escrita. Tu cotización sigue guardada aquí.
                </p>
              </template>
            </div>
          </aside>

          <QuoteMobileBar v-if="puedeEnviar" :total="totalTexto">
            <BaseButton v-if="cotizacionApiActiva" @click="irAlFormulario">Solicitar cotización</BaseButton>
            <BaseButton v-else variant="whatsapp" :href="whatsappLink" target="_blank" rel="noopener">
              <template #icon-left><MessageCircle /></template>
              Enviar por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
            </BaseButton>
          </QuoteMobileBar>
        </div>

        <!-- Formulario de solicitud. scroll-mt: aire sobre el título al llegar desde el resumen
             (el espacio del header fijo lo deja el scroll-padding-top de style.css). -->
        <section
          v-if="cotizacionApiActiva && puedeEnviar"
          ref="solicitud"
          aria-labelledby="cot-solicitud-title"
          class="min-w-0 scroll-mt-6 lg:col-start-1 sm:rounded-md sm:border sm:border-line sm:bg-surface sm:p-8"
        >
          <h2 id="cot-solicitud-title" class="text-title text-ink">Solicitar cotización</h2>
          <p class="mt-1 max-w-[60ch] text-ink-muted">
            Déjanos tus datos y te enviamos el precio final por WhatsApp o correo. No necesitas cuenta.
          </p>

          <!-- novalidate: los mensajes de error los ponemos nosotros, en español y junto a cada campo -->
          <form novalidate class="mt-6 flex flex-col gap-4" @submit.prevent="handleSubmit">
            <BaseInput
              id="cot-nombreCliente"
              v-model="form.nombreCliente"
              label="Nombre y apellido"
              :error="errors.nombreCliente"
              autocomplete="name"
              @blur="handleBlur('nombreCliente')"
            />
            <BaseInput
              id="cot-empresa"
              v-model="form.empresa"
              label="Empresa o negocio (opcional)"
              autocomplete="organization"
            />
            <div class="grid gap-4 sm:grid-cols-2">
              <BasePhoneInput
                id="cot-telefono"
                v-model="form.telefono"
                v-model:pais="form.paisTelefono"
                label="Teléfono"
                hint="Fijo o celular. Si es de otro país, elige su código."
                :error="errors.telefono"
                @blur="handleBlur('telefono')"
              />
              <BaseInput
                id="cot-email"
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
              <label for="cot-notas" class="mb-1.5 text-small font-semibold text-ink">Notas (opcional)</label>
              <textarea
                id="cot-notas"
                v-model="form.notas"
                rows="3"
                aria-describedby="cot-notas-hint"
                class="min-h-24 w-full resize-y rounded-md border border-line-strong bg-surface px-3.5 py-3 text-base text-ink transition-[border-color,box-shadow] duration-200 ease-out hover:border-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none focus-visible:outline-none"
              />
              <p id="cot-notas-hint" class="mt-1.5 text-small text-ink-muted">
                Cuéntanos para qué espacio es (oficina, negocio o casa) o si necesitas entrega.
              </p>
            </div>

            <BaseFormError v-if="serverError">{{ serverError }}</BaseFormError>

            <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <BaseButton type="submit" size="lg" :loading="enviando || revisandoError" class="max-sm:w-full">
                <template #icon-left><Send /></template>
                Enviar solicitud
              </BaseButton>
              <p class="text-small text-ink-muted">
                Se envían {{ lineasDisponibles }} {{ lineasDisponibles === 1 ? 'producto' : 'productos' }}
                (<span class="tabular-nums">{{ cotizacion.totalUnidades }}</span>
                {{ cotizacion.totalUnidades === 1 ? 'unidad' : 'unidades' }}).
              </p>
            </div>
            <LegalNotice action="enviar" />
          </form>
        </section>
      </div>
    </template>

    <!-- Lo anuncia el lector de pantalla al quitar o deshacer -->
    <p role="status" class="sr-only">{{ anuncio }}</p>

    <BaseConfirmDialog
      :open="confirmandoVaciar"
      title="¿Vaciar tu cotización?"
      confirm-label="Sí, vaciar"
      cancel-label="No, mantenerla"
      @confirm="vaciar"
      @close="confirmandoVaciar = false"
    >
      <template v-if="cotizacion.items.length === 1">Se quitará el producto de tu lista.</template>
      <template v-else>Se quitarán los {{ cotizacion.items.length }} productos de tu lista.</template>
      No se puede deshacer.
    </BaseConfirmDialog>
  </div>
</template>
