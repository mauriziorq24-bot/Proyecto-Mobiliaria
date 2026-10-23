<script setup>
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CircleAlert, Copy, ImageOff, LoaderCircle, Plus, Trash2 } from 'lucide-vue-next'
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import { BASE_JSDELIVR, MAX_IMAGENES, repositorioImagenes } from '../../config/imagenes'
import { aJsDelivr, comprobarImagen, revisarUrlImagen } from '../../utils/imagenes'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'

// Lista de fotos de un producto (las URLs de `imagenes`, en orden: la primera es la principal).
// Agregar por URL, quitar, reordenar y ver cada una en 4:5, como en la tienda.
// Cada URL se intenta cargar al agregarla: el formulario pregunta por las que no cargan antes de guardar.
const imagenes = defineModel({ type: Array, required: true })

defineProps({
  // Error del formulario para la lista entera (p. ej. "Agrega al menos una imagen" o un 400 del backend).
  error: { type: String, default: '' },
})

const inputId = useId()
const listId = useId()

// --- Estado de carga de cada URL: 'checking' | 'ok' | 'error' ---
const estados = reactive({})
const pendientes = new Map() // url → promesa de su comprobación

function comprobar(url) {
  if (pendientes.has(url)) return pendientes.get(url)
  estados[url] = 'checking'
  const promesa = comprobarImagen(url).then((carga) => {
    estados[url] = carga ? 'ok' : 'error'
  })
  pendientes.set(url, promesa)
  return promesa
}

// Las del producto que se está editando también se comprueban: una foto rota del backend se ve igual.
watch(imagenes, (lista) => lista.forEach(comprobar), { immediate: true })

const rotas = computed(() => imagenes.value.filter((url) => estados[url] === 'error'))

// --- Agregar ---
const nuevaUrl = ref('')
const errorUrl = ref('')
const lleno = computed(() => imagenes.value.length >= MAX_IMAGENES)

// Un enlace de GitHub funciona, pero se sugiere el de jsDelivr (sirve desde un CDN con caché).
const sugerenciaJsDelivr = computed(() => {
  const convertida = aJsDelivr(nuevaUrl.value)
  return convertida && convertida !== nuevaUrl.value.trim() ? convertida : ''
})

function usarJsDelivr() {
  nuevaUrl.value = sugerenciaJsDelivr.value
  errorUrl.value = ''
  document.getElementById(inputId)?.focus()
}

function agregar() {
  const { url, error } = revisarUrlImagen(nuevaUrl.value)
  if (error) {
    errorUrl.value = error
    return
  }
  if (imagenes.value.includes(url)) {
    errorUrl.value = 'Esa imagen ya está en la lista.'
    return
  }
  imagenes.value = [...imagenes.value, url]
  nuevaUrl.value = ''
  errorUrl.value = ''
  anunciar(`Imagen agregada en la posición ${imagenes.value.length}.`)
}

// Enter en el campo agrega la imagen en vez de enviar el formulario entero.
function onEnter(event) {
  event.preventDefault()
  agregar()
}

// --- Reordenar y quitar ---
const anuncio = ref('')

function anunciar(texto) {
  anuncio.value = ''
  nextTick(() => (anuncio.value = texto))
}

async function enfocarControl(accion, index) {
  await nextTick()
  const boton = document.querySelector(`#${CSS.escape(listId)} [data-control="${accion}-${index}"]`)
  if (boton && !boton.disabled) boton.focus()
  else document.querySelector(`#${CSS.escape(listId)} [data-control="quitar-${index}"]`)?.focus()
}

function mover(index, paso) {
  const destino = index + paso
  if (destino < 0 || destino >= imagenes.value.length) return
  const lista = [...imagenes.value]
  ;[lista[index], lista[destino]] = [lista[destino], lista[index]]
  imagenes.value = lista
  anunciar(
    destino === 0
      ? `Imagen movida a la posición 1: ahora es la principal.`
      : `Imagen movida a la posición ${destino + 1} de ${lista.length}.`,
  )
  // El foco sigue a la imagen que se movió.
  enfocarControl(paso < 0 ? 'antes' : 'despues', destino)
}

function quitar(index) {
  imagenes.value = imagenes.value.filter((_, i) => i !== index)
  anunciar('Imagen quitada.')
  if (imagenes.value.length) enfocarControl('quitar', Math.min(index, imagenes.value.length - 1))
  else document.getElementById(inputId)?.focus()
}

// --- Ayuda: copiar el inicio de la URL de jsDelivr ---
const copiado = ref(false)
let copiadoTimer = null

async function copiarBase() {
  try {
    await navigator.clipboard.writeText(BASE_JSDELIVR)
    copiado.value = true
    clearTimeout(copiadoTimer)
    copiadoTimer = setTimeout(() => (copiado.value = false), 2000)
  } catch {
    // Sin permiso para el portapapeles: el texto está a la vista para copiarlo a mano.
  }
}

function nombreArchivo(url) {
  return decodeURIComponent(url.split('?')[0].split('/').filter(Boolean).pop() ?? url)
}

defineExpose({
  // Espera a que terminen las comprobaciones en curso y devuelve las URLs que no cargan.
  async imagenesRotas() {
    await Promise.all(imagenes.value.map(comprobar))
    return rotas.value
  },
  focus() {
    document.getElementById(inputId)?.focus()
  },
})

const controlClass =
  'relative inline-flex size-9 items-center justify-center rounded-md text-ink transition-[background-color,color] duration-200 ease-out before:absolute before:-inset-1 hover:bg-brand-tint hover:text-brand-deep disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink [&_svg]:size-[18px]'
</script>

<template>
  <div>
    <!-- Agregar por URL -->
    <div class="flex items-start gap-2">
      <!-- BaseInput pasa la clase al <input>, no a su contenedor: el ancho lo da este div -->
      <div class="min-w-0 flex-1">
      <BaseInput
        :id="inputId"
        v-model="nuevaUrl"
        label="URL de la imagen"
        type="url"
        inputmode="url"
        autocomplete="off"
        spellcheck="false"
        :placeholder="`${BASE_JSDELIVR}…`"
        :disabled="lleno"
        :error="errorUrl"
        :hint="lleno ? `Llegaste al máximo de ${MAX_IMAGENES} imágenes. Quita una para agregar otra.` : ''"
        @keydown.enter="onEnter"
        @input="errorUrl = ''"
      />
      </div>
      <!-- El margen es el alto de la etiqueta (text-small × 1.4 + mb-1.5): alinea el botón con el campo -->
      <BaseButton variant="secondary" class="mt-[calc(0.8125rem*1.4+0.375rem)]" :disabled="lleno" @click="agregar">
        <template #icon-left><Plus /></template>
        Agregar
      </BaseButton>
    </div>

    <p v-if="sugerenciaJsDelivr" class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
      Es un enlace de GitHub. Funciona, pero el de jsDelivr carga más rápido.
      <button
        type="button"
        class="font-semibold text-brand-deep underline underline-offset-2 hover:text-brand-deeper"
        @click="usarJsDelivr"
      >
        Usar el de jsDelivr
      </button>
    </p>

    <!-- Ayuda con el formato de la URL -->
    <details class="group mt-3 rounded-md border border-line bg-ground">
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3.5 text-small font-semibold text-brand-deep hover:text-brand-deeper focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden"
      >
        <ArrowRight class="size-4 shrink-0 transition-transform duration-200 ease-out group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        ¿Cómo armo la URL de una foto?
      </summary>
      <div class="space-y-3 px-3.5 pb-4 text-small text-ink">
        <p>
          Sube la foto al repositorio
          <a
            :href="`https://github.com/${repositorioImagenes.usuario}/${repositorioImagenes.repo}`"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-brand-deep underline underline-offset-2 hover:text-brand-deeper"
            >{{ repositorioImagenes.usuario }}/{{ repositorioImagenes.repo }}</a
          >
          en GitHub, dentro de la carpeta de su tipo de mueble. Vertical 4:5 (1080 × 1350 px, como en Instagram), en .webp o .jpg.
        </p>
        <div>
          <p class="text-ink-muted">Después, arma la URL así:</p>
          <p class="mt-1 rounded-sm border border-line bg-surface px-2.5 py-2 font-mono text-[0.8125rem] break-all">
            {{ BASE_JSDELIVR }}<span class="text-brand-deep">carpeta</span>/<span class="text-brand-deep">archivo.webp</span>
          </p>
          <button
            type="button"
            class="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-md font-semibold text-brand-deep hover:text-brand-deeper [&_svg]:size-4"
            @click="copiarBase"
          >
            <component :is="copiado ? Check : Copy" aria-hidden="true" />
            {{ copiado ? 'Copiado' : 'Copiar el inicio de la URL' }}
          </button>
          <span class="sr-only" role="status">{{ copiado ? 'Copiado al portapapeles' : '' }}</span>
        </div>
        <p class="text-ink-muted">
          Ejemplo: <span class="font-mono break-all text-ink">{{ BASE_JSDELIVR }}comedor/comedor-amsterdan.webp</span>
        </p>
        <p class="text-ink-muted">
          Carpetas: <span class="text-ink">{{ repositorioImagenes.carpetas.join(', ') }}</span>.
        </p>
        <p class="text-ink-muted">
          Si reemplazas una foto con el mismo nombre, jsDelivr puede seguir mostrando la anterior hasta 12 horas: súbela con un nombre nuevo.
        </p>
      </div>
    </details>

    <!-- Error de la lista entera -->
    <div aria-live="polite">
      <p v-if="error" class="mt-3 flex items-start gap-1.5 text-small text-error">
        <CircleAlert class="mt-px size-4 shrink-0" aria-hidden="true" />
        {{ error }}
      </p>
    </div>

    <!-- Imágenes: filas en móvil, cuadrícula de tarjetas 4:5 desde sm -->
    <ol
      v-if="imagenes.length"
      :id="listId"
      aria-label="Imágenes del producto"
      class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      <li
        v-for="(url, index) in imagenes"
        :key="url"
        class="flex gap-3 rounded-md border bg-surface p-2 sm:flex-col sm:gap-2"
        :class="estados[url] === 'error' ? 'border-warning' : 'border-line'"
      >
        <div class="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-sm bg-ground sm:w-full">
          <img
            v-if="estados[url] !== 'error'"
            :src="url"
            alt=""
            width="1080"
            height="1350"
            class="size-full object-cover object-center"
          />
          <div v-else class="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-warning">
            <ImageOff class="size-6" :stroke-width="1.75" aria-hidden="true" />
            <span class="hidden text-small font-semibold sm:block">No carga</span>
          </div>
          <span
            v-if="estados[url] === 'checking'"
            class="absolute inset-0 flex items-center justify-center bg-surface/60"
            aria-hidden="true"
          >
            <LoaderCircle class="size-5 animate-spin text-ink-muted" />
          </span>
          <span
            v-if="index === 0"
            class="absolute top-1.5 left-1.5 rounded-sm bg-ink px-[7px] py-[3px] text-label text-white uppercase"
          >
            Principal
          </span>
        </div>

        <div class="flex min-w-0 flex-1 flex-col">
          <p class="truncate text-small font-semibold text-ink" :title="url">
            <span class="sr-only">Imagen {{ index + 1 }}{{ index === 0 ? ' (principal)' : '' }}: </span>{{ nombreArchivo(url) }}
          </p>
          <p
            class="text-small"
            :class="estados[url] === 'error' ? 'font-semibold text-warning' : 'text-ink-muted'"
          >
            <template v-if="estados[url] === 'checking'">Comprobando…</template>
            <template v-else-if="estados[url] === 'error'">No se pudo cargar</template>
            <template v-else>Posición {{ index + 1 }}</template>
          </p>

          <div class="mt-auto flex items-center pt-1 sm:-mx-1">
            <!-- En móvil la lista es vertical: subir/bajar. Desde sm es una cuadrícula: antes/después. -->
            <button
              type="button"
              :class="controlClass"
              :data-control="`antes-${index}`"
              :disabled="index === 0"
              :aria-label="`Mover imagen ${index + 1} antes`"
              :title="index === 1 ? 'Hacerla principal' : 'Mover antes'"
              @click="mover(index, -1)"
            >
              <ArrowUp class="sm:hidden" aria-hidden="true" />
              <ArrowLeft class="hidden sm:block" aria-hidden="true" />
            </button>
            <button
              type="button"
              :class="controlClass"
              :data-control="`despues-${index}`"
              :disabled="index === imagenes.length - 1"
              :aria-label="`Mover imagen ${index + 1} después`"
              title="Mover después"
              @click="mover(index, 1)"
            >
              <ArrowDown class="sm:hidden" aria-hidden="true" />
              <ArrowRight class="hidden sm:block" aria-hidden="true" />
            </button>
            <button
              type="button"
              :class="controlClass"
              class="ml-auto hover:bg-error-bg! hover:text-error!"
              :data-control="`quitar-${index}`"
              :aria-label="`Quitar imagen ${index + 1}`"
              title="Quitar"
              @click="quitar(index)"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      </li>
    </ol>
    <p v-else class="mt-4 rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-small text-ink-muted">
      Todavía no hay imágenes. La primera que agregues será la principal: la que se ve en el catálogo.
    </p>

    <p class="sr-only" role="status">{{ anuncio }}</p>
  </div>
</template>
