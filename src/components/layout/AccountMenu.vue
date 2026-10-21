<script setup>
import { ChevronDown, LogOut, User, UserRound } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useLogout } from '../../composables/useLogout'
import { useAuthStore } from '../../stores/auth'
import BaseIconButton from '../ui/BaseIconButton.vue'

// Cuenta en el header de escritorio (en móvil y tablet vive en el menú lateral).
// Sin sesión: ícono que lleva a /login. Con sesión: botón con la inicial que abre un menú
// con el nombre, "Mi perfil" y "Cerrar sesión" (patrón "menu button" de WAI-ARIA).
const auth = useAuthStore()
const route = useRoute()
const { logout } = useLogout()

const username = computed(() => auth.usuario?.username ?? '')
const initial = computed(() => username.value.charAt(0).toUpperCase())

const open = ref(false)
const wrapper = ref(null)
const trigger = ref(null)
const menu = ref(null)
const loginLink = ref(null)

function items() {
  return [...(menu.value?.querySelectorAll('[role="menuitem"]') ?? [])]
}

// El menú se dibuja en el siguiente ciclo: hay que esperar a que exista para enfocar un ítem.
async function openMenu(focus = 'first') {
  open.value = true
  await nextTick()
  const list = items()
  ;(focus === 'last' ? list.at(-1) : list[0])?.focus()
}

function closeMenu({ returnFocus = false } = {}) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function toggle() {
  if (open.value) closeMenu()
  else openMenu()
}

// Flecha abajo / arriba sobre el botón abren el menú en el primer o el último ítem.
function onTriggerKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    openMenu('first')
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    openMenu('last')
  }
}

// Dentro del menú: flechas, Inicio y Fin recorren los ítems; Escape cierra y devuelve
// el foco al botón; Tab cierra y deja que el foco siga su camino normal.
function onMenuKeydown(event) {
  const list = items()
  const index = list.indexOf(document.activeElement)
  const focusAt = (i) => list[(i + list.length) % list.length]?.focus()

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusAt(index + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusAt(index - 1)
      break
    case 'Home':
      event.preventDefault()
      focusAt(0)
      break
    case 'End':
      event.preventDefault()
      focusAt(list.length - 1)
      break
    case 'Escape':
      event.preventDefault()
      closeMenu({ returnFocus: true })
      break
    case 'Tab':
      closeMenu()
      break
  }
}

// Clic (o toque) fuera del menú: se cierra sin mover el foco.
function onPointerDown(event) {
  if (open.value && !wrapper.value?.contains(event.target)) closeMenu()
}

async function handleLogout() {
  closeMenu()
  await logout()
  // El botón del menú desaparece al cerrar sesión: el foco pasa al ícono "Ingresar"
  // que ocupa su lugar, para que quien usa teclado no quede al inicio de la página.
  await nextTick()
  loginLink.value?.$el?.focus()
}

// Al cambiar de página (p. ej. tras elegir "Mi perfil") el menú se cierra.
watch(
  () => route.fullPath,
  () => closeMenu(),
)

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))

const menuItem =
  'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left font-semibold text-ink transition-colors duration-200 ease-out hover:bg-ground focus-visible:bg-ground [&>svg]:size-[18px] [&>svg]:text-ink-muted'
</script>

<template>
  <BaseIconButton v-if="!auth.estaSesionIniciada" ref="loginLink" :icon="User" label="Ingresar" variant="inverse" to="/login" />

  <div v-else ref="wrapper" class="relative">
    <!-- La inicial va en blanco con letra Azul Acción: el texto blanco pequeño sobre Azul Silla
         no llega a AA (DESIGN.md), así que el nombre completo se lee dentro del menú. -->
    <button
      ref="trigger"
      type="button"
      class="inline-flex h-11 items-center gap-1 rounded-md pr-1.5 pl-1.5 text-white transition-colors duration-200 ease-out hover:bg-white/15 focus-visible:outline-white"
      :class="open && 'bg-white/15'"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-controls="account-menu"
      :aria-label="`Mi cuenta, ${username}`"
      :title="username"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span
        class="inline-flex size-8 items-center justify-center rounded-full bg-surface text-base font-bold text-brand-deep"
        aria-hidden="true"
      >
        {{ initial }}
      </span>
      <ChevronDown
        class="size-4 transition-transform duration-200 ease-out motion-reduce:transition-none"
        :class="open && 'rotate-180'"
        :stroke-width="2"
        aria-hidden="true"
      />
    </button>

    <Transition
      enter-active-class="transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0 scale-[0.97] -translate-y-1"
      leave-active-class="transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
      leave-to-class="opacity-0 scale-[0.98]"
    >
      <div
        v-if="open"
        class="absolute top-[calc(100%+6px)] right-0 z-50 w-64 origin-top-right rounded-lg bg-surface p-2 shadow-lg"
      >
        <div class="border-b border-line px-3 pt-2 pb-3">
          <p class="text-small text-ink-muted">Sesión iniciada como</p>
          <p class="truncate font-bold text-ink" :title="username">{{ username }}</p>
        </div>

        <ul id="account-menu" ref="menu" role="menu" aria-label="Mi cuenta" class="pt-2" @keydown="onMenuKeydown">
          <li role="none">
            <RouterLink to="/perfil" role="menuitem" tabindex="-1" :class="menuItem">
              <UserRound :stroke-width="1.75" aria-hidden="true" />
              Mi perfil
            </RouterLink>
          </li>
          <li role="none">
            <button type="button" role="menuitem" tabindex="-1" :class="menuItem" @click="handleLogout">
              <LogOut :stroke-width="1.75" aria-hidden="true" />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
