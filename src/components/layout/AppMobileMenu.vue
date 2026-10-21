<script setup>
import { CalendarCheck, ChevronRight, LogOut, MessageCircle, Phone, UserRound, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useLogout } from '../../composables/useLogout'
import { useAuthStore } from '../../stores/auth'
import { whatsappUrl } from '../../utils/whatsapp'
import BaseButton from '../ui/BaseButton.vue'
import BaseIconButton from '../ui/BaseIconButton.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  categorias: { type: Array, default: () => [] },
  company: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const auth = useAuthStore()
const { logout } = useLogout()
const username = computed(() => auth.usuario?.username ?? '')
const initial = computed(() => username.value.charAt(0).toUpperCase())

// Se cierra el menú primero: el foco vuelve al botón ☰ y la página queda a la vista.
function handleLogout() {
  emit('close')
  logout()
}

const panel = ref(null)
const closeButton = ref(null)

// Mientras el menú está abierto, la página de fondo no se desplaza.
watch(
  () => props.open,
  async (isOpen) => {
    document.documentElement.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) {
      await nextTick()
      closeButton.value?.$el?.focus()
    }
  },
)
onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
})

// Teclado: Escape cierra y Tab no se escapa del panel (trampa de foco).
function onKeydown(event) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (event.key !== 'Tab') return

  const focusables = panel.value.querySelectorAll('a[href], button:not([disabled])')
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

// Cualquier enlace del panel lo cierra, incluso si lleva a la página actual.
function onPanelClick(event) {
  if (event.target.closest('a')) emit('close')
}

const linkRow =
  'flex min-h-12 items-center justify-between gap-3 rounded-md px-3 font-semibold text-ink transition-colors duration-200 ease-out hover:bg-ground'
</script>

<template>
  <Teleport to="body">
    <!-- Fondo oscuro: se desvanece. Tocarlo cierra el menú. -->
    <Transition
      enter-active-class="transition-opacity duration-[280ms] ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200 ease-out"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 bg-ink/40" aria-hidden="true" @click="emit('close')" />
    </Transition>

    <!-- Panel: entra desde la derecha (donde está el botón ☰) con una curva tipo "drawer":
         arranca rápido y frena suave. Al salir es un poco más corto, para no hacer esperar. -->
    <Transition
      enter-active-class="transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="open"
        ref="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        class="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,88vw)] flex-col rounded-l-lg bg-surface shadow-lg"
        @keydown="onKeydown"
        @click="onPanelClick"
      >
        <div class="flex h-16 shrink-0 items-center justify-between border-b border-line pr-2.5 pl-5">
          <h2 id="mobile-menu-title" class="text-title">Menú</h2>
          <BaseIconButton ref="closeButton" :icon="X" label="Cerrar menú" @click="emit('close')" />
        </div>

        <div class="flex-1 overflow-y-auto overscroll-contain px-3 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <!-- Cuenta: con sesión, nombre + "Mi perfil" y "Cerrar sesión"; sin sesión, ingresar o registrarse -->
          <section v-if="auth.estaSesionIniciada" aria-labelledby="mobile-account-title">
            <h3 id="mobile-account-title" class="sr-only">Mi cuenta</h3>
            <div class="flex items-center gap-3 px-3 pb-2">
              <span
                class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint text-base font-bold text-brand-deep"
                aria-hidden="true"
              >
                {{ initial }}
              </span>
              <p class="min-w-0">
                <span class="block text-small text-ink-muted">Sesión iniciada como</span>
                <span class="block truncate font-bold text-ink">{{ username }}</span>
              </p>
            </div>
            <ul>
              <li>
                <RouterLink to="/perfil" :class="linkRow">
                  <span class="inline-flex items-center gap-2.5">
                    <UserRound class="size-[18px] text-ink-muted" aria-hidden="true" />
                    Mi perfil
                  </span>
                  <ChevronRight class="size-[18px] text-ink-muted" aria-hidden="true" />
                </RouterLink>
              </li>
              <li>
                <button type="button" :class="linkRow" class="w-full justify-start gap-2.5" @click="handleLogout">
                  <LogOut class="size-[18px] text-ink-muted" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </section>
          <div v-else class="grid grid-cols-2 gap-2 px-2">
            <BaseButton to="/login" block>Ingresar</BaseButton>
            <BaseButton to="/registro" variant="secondary" block>Crear cuenta</BaseButton>
          </div>

          <div class="mt-3 px-2">
            <BaseButton to="/agendar-cita" variant="visit" block>
              <template #icon-left><CalendarCheck /></template>
              Agendar visita al showroom
            </BaseButton>
          </div>

          <h3 class="mt-8 mb-1 px-3 text-label text-ink-muted uppercase">Categorías</h3>
          <ul>
            <li v-for="categoria in categorias" :key="categoria.id">
              <RouterLink :to="`/categoria/${categoria.slug}`" :class="linkRow">
                {{ categoria.nombre }}
                <ChevronRight class="size-[18px] text-ink-muted" aria-hidden="true" />
              </RouterLink>
            </li>
            <li>
              <RouterLink :to="{ name: 'search', query: { enShowroom: 'true' } }" :class="linkRow">
                <span class="inline-flex items-center gap-2.5">
                  <span class="size-2 rounded-full bg-showroom-gold" aria-hidden="true" />
                  En showroom
                </span>
                <ChevronRight class="size-[18px] text-ink-muted" aria-hidden="true" />
              </RouterLink>
            </li>
          </ul>

          <h3 class="mt-8 mb-3 px-3 text-label text-ink-muted uppercase">Contacto</h3>
          <div class="px-2">
            <BaseButton :href="whatsappUrl()" target="_blank" rel="noopener" variant="whatsapp" block>
              <template #icon-left><MessageCircle /></template>
              Escribir por WhatsApp
            </BaseButton>
          </div>
          <ul class="mt-2">
            <li v-for="phone in company.phones" :key="phone.value">
              <a :href="`tel:${phone.value}`" :class="linkRow" class="justify-start font-medium tabular-nums">
                <Phone class="size-[18px] text-ink-muted" aria-hidden="true" />
                {{ phone.display }}
              </a>
            </li>
          </ul>
          <dl class="mt-3 space-y-1 px-3 text-small text-ink-muted">
            <div v-for="item in company.showroom.schedule" :key="item.days" class="flex justify-between gap-4">
              <dt>{{ item.days }}</dt>
              <dd class="tabular-nums">{{ item.hours }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
