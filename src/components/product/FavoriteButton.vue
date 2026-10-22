<script setup>
import { Heart } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useFavoritosStore } from '../../stores/favoritos'

const props = defineProps({
  // El ProductoResponse completo: al guardarlo, el store copia nombre, categoría y foto
  // (por si un día sale del catálogo). El nombre va además en el aria-label.
  producto: { type: Object, required: true },
  // card: ícono suelto de la tarjeta (DESIGN.md › Tarjeta de producto) · detail: con borde, en la ficha.
  variant: {
    type: String,
    default: 'card',
    validator: (value) => ['card', 'detail'].includes(value),
  },
})

const favoritos = useFavoritosStore()
const favorito = computed(() => favoritos.esFavorito(props.producto.id))

// Para el lector de pantalla el nombre no cambia: aria-pressed ya dice si está guardado
// ("Guardar X en favoritos, presionado"). Si el nombre también cambiara, sonaría contradictorio.
const ariaLabel = computed(() => `Guardar ${props.producto.nombre} en favoritos`)

// El tooltip (title) sí dice qué hará el clic: quien usa el mouse no ve aria-pressed.
const title = computed(() =>
  favorito.value ? `Quitar ${props.producto.nombre} de favoritos` : `Guardar ${props.producto.nombre} en favoritos`,
)

// Cada vez que se marca, sube el contador: el :key del corazón cambia, Vue lo vuelve a crear y la
// animación arranca de cero (también si se toca rápido varias veces). En 0 no se anima, así el
// corazón no "late" al cargar la página ni cuando el cambio llega de otra pestaña.
const pops = ref(0)

// Al quitar, avisa con lo que devuelve el store ({ item, indice }): la página de Favoritos lo usa
// para ofrecer "Deshacer". En las demás páginas nadie escucha el evento y basta con el corazón vacío.
const emit = defineEmits(['removed'])

// .prevent.stop en el template: en la tarjeta el botón está encima del enlace estirado, y así un
// toque en el corazón nunca termina abriendo la ficha del producto.
function toggle() {
  if (favorito.value) {
    const quitado = favoritos.quitar(props.producto.id)
    if (quitado) emit('removed', quitado)
    return
  }
  favoritos.agregar(props.producto)
  pops.value++
}

const variantClasses = {
  card: '-mr-2 -mb-2 hover:bg-brand-tint hover:text-brand-deep [&>svg]:size-5',
  detail: 'border border-line bg-surface hover:border-brand-deep hover:text-brand-deep [&>svg]:size-[22px]',
}
</script>

<template>
  <!--
    size-11 = 44px de área táctil en las dos variantes.
    La presión (scale 0.9) va en el botón y el "latido" en el ícono: así las dos transformaciones
    no se pisan.
  -->
  <button
    type="button"
    class="relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-[color,background-color,border-color,transform] duration-200 ease-out active:scale-[0.9]"
    :class="[variantClasses[variant], favorito ? 'text-brand-deep' : variant === 'card' ? 'text-ink-muted' : 'text-ink']"
    :data-favorito-de="producto.id"
    :aria-pressed="favorito"
    :aria-label="ariaLabel"
    :title="title"
    @click.prevent.stop="toggle"
  >
    <!-- motion-safe: con prefers-reduced-motion el corazón se rellena sin animarse -->
    <Heart
      :key="pops"
      :fill="favorito ? 'currentColor' : 'none'"
      :stroke-width="1.75"
      :class="pops > 0 && favorito && 'motion-safe:animate-heart-pop'"
      aria-hidden="true"
    />
  </button>
</template>
