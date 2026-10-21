<script setup>
import { Info } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAsync } from '../../composables/useAsync'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { submitErrorMessage } from '../../services/errorMessages'
import { useAuthStore } from '../../stores/auth'
import { GOOGLE_CLIENT_ID, SHOW_MOCK_GOOGLE_BUTTON } from '../../utils/googleSignIn'
import BaseFormError from '../ui/BaseFormError.vue'
import GoogleSignInButton from './GoogleSignInButton.vue'

// Estructura común de /login y /registro (DESIGN.md › Login y registro):
// título, Google, separador, formulario (slot), enlace a la otra pantalla y aviso "sin cuenta".
// El inicio de sesión con Google vive aquí porque es idéntico en las dos pantallas.
defineProps({
  title: { type: String, required: true },
  // Texto del separador: "o con tu correo", "o con tu usuario o correo".
  separatorText: { type: String, required: true },
  switchPrompt: { type: String, required: true },
  switchLabel: { type: String, required: true },
  // Nombre de la ruta de la otra pantalla ('login' o 'register').
  switchTo: { type: String, required: true },
})

const auth = useAuthStore()
const { goToRedirect, linkTo } = useAuthRedirect()

const googleUnavailable = ref(false)
const showGoogle = computed(() => (Boolean(GOOGLE_CLIENT_ID) || SHOW_MOCK_GOOGLE_BUTTON) && !googleUnavailable.value)

// useAsync también activa el aviso "Estamos despertando el servidor…" si tarda más de 5 s.
const google = useAsync((credential) => auth.loginConGoogle(credential), { immediate: false })
const googleErrorMessage = computed(() =>
  google.error.value ? submitErrorMessage(google.error.value, 'ingresar con Google') : '',
)

async function handleGoogleCredential(credential) {
  await google.execute(credential)
  if (!google.error.value) goToRedirect()
}
</script>

<template>
  <div class="mx-auto w-full max-w-md px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
    <!-- En móvil no hay tarjeta: los campos van directo sobre el fondo. Desde sm, tarjeta plana con borde. -->
    <section aria-labelledby="auth-title" class="sm:rounded-md sm:border sm:border-line sm:bg-surface sm:p-8">
      <h1 id="auth-title" class="text-headline text-balance text-ink">{{ title }}</h1>
      <!-- TODO: ampliar cuando existan (DESIGN.md › Login y registro):
           "Tus datos se completan solos al pedir una cotización" (Fase 7) y
           "Revisa tus citas" (si el backend agrega un GET de las citas del usuario). -->
      <p class="mt-2 text-ink-muted">Con una cuenta puedes agendar visitas a nuestro showroom.</p>

      <div v-if="showGoogle" class="mt-6">
        <GoogleSignInButton @credential="handleGoogleCredential" @unavailable="googleUnavailable = true" />

        <p v-if="google.loading.value" role="status" class="mt-3 text-center text-small text-ink-muted">
          Ingresando con Google…
        </p>
        <BaseFormError v-else-if="googleErrorMessage" class="mt-3">{{ googleErrorMessage }}</BaseFormError>

        <div class="my-6 flex items-center gap-3 text-small text-ink-muted">
          <span class="h-px flex-1 bg-line" aria-hidden="true" />
          {{ separatorText }}
          <span class="h-px flex-1 bg-line" aria-hidden="true" />
        </div>
      </div>

      <div :class="!showGoogle && 'mt-6'">
        <slot />
      </div>

      <p class="mt-6 text-center text-ink-muted">
        {{ switchPrompt }}
        <RouterLink
          :to="linkTo(switchTo)"
          class="font-semibold text-brand-deep underline-offset-4 hover:underline focus-visible:underline"
        >
          {{ switchLabel }}
        </RouterLink>
      </p>
    </section>

    <!-- Mientras POST /api/v1/citas exija token, el aviso no menciona las visitas
         (pendiente 10-quater de API.md). Si se vuelven públicas, agregarlas aquí. -->
    <aside class="mt-6 flex gap-3 rounded-md bg-brand-tint p-4 sm:mt-4">
      <Info class="mt-0.5 size-5 shrink-0 text-brand-deep" aria-hidden="true" />
      <p class="text-ink">
        No necesitas cuenta para cotizar ni para escribirnos por WhatsApp.
        <RouterLink
          :to="{ name: 'search' }"
          class="font-semibold whitespace-nowrap text-brand-deep underline underline-offset-4 hover:text-brand-deeper"
        >
          Ver catálogo
        </RouterLink>
      </p>
    </aside>
  </div>
</template>
