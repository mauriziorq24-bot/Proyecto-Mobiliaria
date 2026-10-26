<script setup>
import { FolderPlus, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { computed, nextTick, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseConfirmDialog from '../../components/ui/BaseConfirmDialog.vue'
import BaseErrorState from '../../components/ui/BaseErrorState.vue'
import BaseFormError from '../../components/ui/BaseFormError.vue'
import BaseIconButton from '../../components/ui/BaseIconButton.vue'
import { useAsync } from '../../composables/useAsync'
import { recargarCategorias } from '../../composables/useCategorias'
import { useToast } from '../../composables/useToast'
import { eliminarCategoria, ERRORES_CATEGORIA, esCategoriaNoEncontrada, getCategorias } from '../../services/categoriaService'
import { FORBIDDEN_MESSAGE, isForbidden, submitErrorMessage } from '../../services/errorMessages'
import { contarOpciones, invalidarCatalogo, obtenerProductos } from '../../services/productoService'

// Lista de categorías del panel, con cuántos productos tiene cada una. La API no da ese número:
// se cuenta con el catálogo completo (la misma cuenta que los filtros de /buscar).
// Van en el orden de la API, que es el mismo del menú de la tienda.
const router = useRouter()
const toast = useToast()

const pedirDatos = () => Promise.all([getCategorias(), obtenerProductos()])
const carga = useAsync(pedirDatos)
const categorias = computed(() => carga.data.value?.[0] ?? [])
const productos = computed(() => carga.data.value?.[1] ?? [])

// { silleria: 3, escritorios: 0, … }
const conteo = computed(() => contarOpciones(productos.value, {}, categorias.value).categorias)
const productosDe = (categoria) => conteo.value[categoria.slug] ?? 0

const numero = new Intl.NumberFormat('es-VE')
const cantidadProductos = (n) => `${numero.format(n)} ${n === 1 ? 'producto' : 'productos'}`

const resumen = computed(() => {
  const total = categorias.value.length
  const vacias = categorias.value.filter((c) => productosDe(c) === 0).length
  const base = `${numero.format(total)} ${total === 1 ? 'categoría' : 'categorías'}`
  if (!vacias || vacias === total) return base
  return `${base} · ${numero.format(vacias)} sin productos`
})

// --- Eliminar ---
// Con productos no se ofrece eliminar: el diálogo avisa y lleva a esos productos. Así ninguno
// queda sin categoría (o se borra con ella, según lo que haga el backend: pendiente 32 de API.md).
const aEliminar = ref(null)
const productosAEliminar = computed(() => (aEliminar.value ? productosDe(aEliminar.value) : 0))
const eliminacion = useAsync((id) => eliminarCategoria(id), { immediate: false })

const tituloDialogo = computed(() => {
  if (!aEliminar.value) return ''
  if (productosAEliminar.value) return `«${aEliminar.value.nombre}» todavía tiene ${cantidadProductos(productosAEliminar.value)}`
  return `¿Eliminar «${aEliminar.value.nombre}»?`
})

const errorEliminar = computed(() => {
  const error = eliminacion.error.value
  if (!error) return ''
  if (isForbidden(error)) return FORBIDDEN_MESSAGE
  if (error.code === ERRORES_CATEGORIA.TIENE_PRODUCTOS) {
    return error.message
      ? `El servidor no la eliminó: «${error.message}»`
      : 'El servidor no la eliminó porque todavía tiene productos.'
  }
  return submitErrorMessage(error, 'eliminar la categoría')
})

function pedirEliminar(categoria) {
  eliminacion.error.value = null
  aEliminar.value = categoria
}

function verSusProductos() {
  const { slug } = aEliminar.value
  aEliminar.value = null
  router.push({ name: 'admin-products', query: { categoria: slug } })
}

// Vuelve a contar sin pasar por el skeleton: la lista sigue a la vista (y el diálogo abierto).
// Si la categoría resulta tener productos, el diálogo cambia solo al aviso de "todavía tiene productos".
async function actualizarEnSilencio() {
  try {
    carga.data.value = await pedirDatos()
  } catch {
    // Si falla, se queda la lista que ya había: el error del diálogo ya explica qué pasó.
  }
}

async function confirmarEliminar() {
  const categoria = aEliminar.value
  await eliminacion.execute(categoria.id)
  const error = eliminacion.error.value

  if (error?.code === ERRORES_CATEGORIA.TIENE_PRODUCTOS) {
    // Nuestro conteo decía 0: alguien agregó productos mientras tanto, o el catálogo estaba viejo.
    invalidarCatalogo()
    actualizarEnSilencio()
    return
  }
  // Si ya no existía, el resultado es el mismo que se buscaba: sale de la lista.
  if (error && !esCategoriaNoEncontrada(error)) return

  eliminacion.error.value = null
  aEliminar.value = null
  carga.data.value = [categorias.value.filter((c) => c.id !== categoria.id), productos.value]
  invalidarCatalogo()
  recargarCategorias()
  toast.show(error ? `«${categoria.nombre}» ya no existía.` : `Eliminamos la categoría «${categoria.nombre}».`, { tone: 'success' })
  // El botón que abrió el diálogo ya no existe: el foco va al título.
  await nextTick()
  document.getElementById('categorias-titulo')?.focus()
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-4 pt-8 pb-12 sm:px-6 lg:px-10 lg:pt-10">
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 id="categorias-titulo" tabindex="-1" class="text-headline text-ink focus:outline-none">Categorías</h1>
        <!-- Sin aria-live: tras eliminar ya hablan el aviso de Éxito y el foco en el título -->
        <p class="mt-1 text-ink-muted tabular-nums">
          <template v-if="carga.data.value">{{ resumen }}</template>
          <template v-else>Las secciones del menú de la tienda.</template>
        </p>
      </div>
      <BaseButton :to="{ name: 'admin-category-new' }">
        <template #icon-left><Plus /></template>
        Nueva categoría
      </BaseButton>
    </div>

    <!-- Cargando -->
    <ul v-if="carga.loading.value" class="mt-6 divide-y divide-line rounded-md border border-line bg-surface" aria-busy="true">
      <li class="sr-only">Cargando las categorías…</li>
      <li v-for="n in 5" :key="n" class="flex items-center gap-4 px-4 py-4" aria-hidden="true">
        <div class="min-w-0 flex-1 space-y-2">
          <div class="h-3.5 w-2/5 animate-pulse rounded-sm bg-line" />
          <div class="h-3 w-3/5 animate-pulse rounded-sm bg-ground" />
        </div>
        <div class="h-4 w-20 animate-pulse rounded-sm bg-line" />
      </li>
    </ul>

    <div v-else-if="carga.error.value" class="mt-6">
      <BaseErrorState title="No pudimos cargar las categorías" :error="carga.error.value" subject="las categorías" @retry="carga.retry()" />
    </div>

    <!-- Sin categorías -->
    <div v-else-if="!categorias.length" class="mt-6 flex flex-col items-center rounded-md border border-line bg-surface px-6 py-12 text-center">
      <FolderPlus class="size-8 text-ink-muted" :stroke-width="1.75" aria-hidden="true" />
      <p class="mt-3 text-card-title text-ink">Aún no hay categorías</p>
      <p class="mt-1 max-w-[45ch] text-small text-ink-muted">
        Crea la primera: aparece en el menú de la tienda apenas la guardas, y los productos se ordenan en ella.
      </p>
      <BaseButton class="mt-5" :to="{ name: 'admin-category-new' }">
        <template #icon-left><Plus /></template>
        Nueva categoría
      </BaseButton>
    </div>

    <template v-else>
      <!-- Escritorio y tablet: tabla -->
      <div class="mt-6 hidden overflow-hidden rounded-md border border-line bg-surface md:block">
        <table class="w-full text-left">
          <caption class="sr-only">Categorías de la tienda</caption>
          <thead class="border-b border-line bg-ground">
            <tr class="text-label text-ink-muted uppercase">
              <th scope="col" class="px-4 py-3">Categoría</th>
              <th scope="col" class="px-4 py-3">Enlace</th>
              <th scope="col" class="px-4 py-3 text-right">Productos</th>
              <th scope="col" class="px-4 py-3 text-right"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="categoria in categorias" :key="categoria.id" class="transition-colors duration-200 ease-out hover:bg-ground/60">
              <td class="px-4 py-3">
                <RouterLink
                  :to="{ name: 'admin-category-edit', params: { id: categoria.id } }"
                  class="font-semibold text-ink hover:text-brand-deep hover:underline hover:underline-offset-2"
                >
                  {{ categoria.nombre }}
                </RouterLink>
                <p class="line-clamp-1 max-w-[52ch] text-small text-ink-muted">
                  {{ categoria.descripcion || 'Sin descripción' }}
                </p>
              </td>
              <td class="px-4 py-3">
                <span class="font-mono text-small [overflow-wrap:anywhere] text-ink-muted">/categoria/{{ categoria.slug }}</span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                <RouterLink
                  v-if="productosDe(categoria)"
                  :to="{ name: 'admin-products', query: { categoria: categoria.slug } }"
                  class="font-semibold text-brand-deep underline-offset-2 hover:text-brand-deeper hover:underline"
                >
                  {{ cantidadProductos(productosDe(categoria)) }}
                  <span class="sr-only">de {{ categoria.nombre }}</span>
                </RouterLink>
                <span v-else class="text-small text-ink-muted">Sin productos</span>
              </td>
              <td class="px-2 py-3">
                <div class="flex justify-end">
                  <BaseIconButton :icon="Pencil" :label="`Editar ${categoria.nombre}`" :to="{ name: 'admin-category-edit', params: { id: categoria.id } }" />
                  <BaseIconButton :icon="Trash2" :label="`Eliminar ${categoria.nombre}`" class="hover:bg-error-bg! hover:text-error!" @click="pedirEliminar(categoria)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Móvil: tarjetas -->
      <ul class="mt-6 divide-y divide-line rounded-md border border-line bg-surface md:hidden">
        <li v-for="categoria in categorias" :key="categoria.id" class="relative flex items-start gap-3 p-4 pr-2">
          <div class="min-w-0 flex-1">
            <!-- Enlace estirado: toda la tarjeta lleva a editar -->
            <RouterLink
              :to="{ name: 'admin-category-edit', params: { id: categoria.id } }"
              class="font-semibold text-ink after:absolute after:inset-0 after:content-['']"
            >
              {{ categoria.nombre }}
            </RouterLink>
            <p class="font-mono text-small [overflow-wrap:anywhere] text-ink-muted">/categoria/{{ categoria.slug }}</p>
            <p class="mt-1.5 text-small tabular-nums" :class="productosDe(categoria) ? 'font-semibold text-ink' : 'text-ink-muted'">
              {{ productosDe(categoria) ? cantidadProductos(productosDe(categoria)) : 'Sin productos' }}
            </p>
          </div>
          <BaseIconButton
            :icon="Trash2"
            :label="`Eliminar ${categoria.nombre}`"
            class="relative z-10 -mt-2 hover:bg-error-bg! hover:text-error!"
            @click="pedirEliminar(categoria)"
          />
        </li>
      </ul>
    </template>

    <!-- Un solo diálogo con dos formas: si tiene productos, avisa y lleva a ellos en vez de intentar
         eliminarla. Es el mismo <dialog>: si el conteo cambia con él abierto, cambia de forma sin cerrarse. -->
    <BaseConfirmDialog
      :open="aEliminar !== null"
      :title="tituloDialogo"
      :confirm-label="productosAEliminar ? 'Ver sus productos' : 'Sí, eliminar categoría'"
      :confirm-variant="productosAEliminar ? 'primary' : 'danger'"
      :cancel-label="productosAEliminar ? 'Volver' : 'No, mantenerla'"
      :loading="eliminacion.loading.value"
      @confirm="productosAEliminar ? verSusProductos() : confirmarEliminar()"
      @close="aEliminar = null"
    >
      <p v-if="productosAEliminar">
        Para eliminarla, primero cambia esos productos a otra categoría o elimínalos. Así ninguno queda sin categoría en la
        tienda.
      </p>
      <p v-else>
        Sale del menú de la tienda y su página
        <span class="font-mono text-small [overflow-wrap:anywhere] text-ink">/categoria/{{ aEliminar?.slug }}</span>
        deja de existir. No se puede deshacer.
      </p>
      <template #error>
        <div v-if="errorEliminar && !productosAEliminar" class="mt-4"><BaseFormError>{{ errorEliminar }}</BaseFormError></div>
      </template>
    </BaseConfirmDialog>
  </div>
</template>
