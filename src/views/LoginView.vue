<script setup>
import { computed, reactive, ref } from 'vue'
import AuthLayout from '../components/layout/AuthLayout.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseFormError from '../components/ui/BaseFormError.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BasePasswordInput from '../components/ui/BasePasswordInput.vue'
import { useAsync } from '../composables/useAsync'
import { useAuthRedirect } from '../composables/useAuthRedirect'
import { isInvalidCredentials } from '../services/authService'
import { submitErrorMessage } from '../services/errorMessages'
import { useAuthStore } from '../stores/auth'
import { whatsappUrl } from '../utils/whatsapp'

const auth = useAuthStore()
const { goToRedirect } = useAuthRedirect()

// "username" puede ser el nombre de usuario o el correo: el backend acepta los dos (API.md).
const form = reactive({ username: '', password: '' })
const errors = reactive({ username: '', password: '' })

// Cada regla devuelve el mensaje de error, o '' si el campo está bien.
const rules = {
  username: (value) => (value.trim() ? '' : 'Escribe tu usuario o correo.'),
  password: (value) => (value ? '' : 'Escribe tu contraseña.'),
}
const fields = Object.keys(rules)

// Antes del primer envío no se marcan errores: nadie quiere ver "campo obligatorio" sin haber escrito.
// Después, cada campo se revisa al salir de él.
const attempted = ref(false)

function validateField(field) {
  errors[field] = rules[field](form[field])
}

function handleBlur(field) {
  if (attempted.value) validateField(field)
}

// useAsync activa el aviso "Estamos despertando el servidor…" si Render tarda más de 5 s.
const { loading, error, execute } = useAsync((credentials) => auth.login(credentials), { immediate: false })

const serverError = computed(() => {
  if (!error.value) return ''
  if (isInvalidCredentials(error.value)) return 'Usuario o contraseña incorrectos.'
  return submitErrorMessage(error.value, 'ingresar')
})

// Sin recuperación de contraseña en el backend: se resuelve por WhatsApp.
// Si ya escribió su usuario o correo, va en el mensaje para que la empresa sepa de qué cuenta se trata.
const forgotPasswordUrl = computed(() => {
  const username = form.username.trim()
  const message = 'Hola, olvidé mi contraseña de la página web.'
  return whatsappUrl(username ? `${message} Mi usuario o correo es: ${username}` : message)
})

async function handleSubmit() {
  attempted.value = true
  fields.forEach(validateField)

  const firstInvalid = fields.find((field) => errors[field])
  if (firstInvalid) {
    error.value = null // el error del envío anterior ya no aplica
    document.getElementById(`login-${firstInvalid}`)?.focus()
    return
  }

  await execute({ username: form.username.trim(), password: form.password })
  if (!error.value) goToRedirect()
}
</script>

<template>
  <AuthLayout
    title="Ingresa a tu cuenta"
    separator-text="o con tu usuario o correo"
    switch-prompt="¿Primera vez aquí?"
    switch-label="Crea tu cuenta"
    switch-to="register"
  >
    <!-- novalidate: los mensajes de error los ponemos nosotros, en español y junto a cada campo -->
    <form novalidate class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <BaseInput
        id="login-username"
        v-model="form.username"
        label="Usuario o correo"
        :error="errors.username"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        @blur="handleBlur('username')"
      />

      <div class="flex flex-col gap-2">
        <BasePasswordInput
          id="login-password"
          v-model="form.password"
          label="Contraseña"
          :error="errors.password"
          autocomplete="current-password"
          @blur="handleBlur('password')"
        />
        <p class="text-small text-ink-muted">
          ¿Olvidaste tu contraseña?
          <a
            :href="forgotPasswordUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper"
          >
            Escríbenos por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </p>
      </div>

      <BaseFormError v-if="serverError">{{ serverError }}</BaseFormError>

      <BaseButton type="submit" block :loading="loading" class="mt-2">Ingresar</BaseButton>
    </form>
  </AuthLayout>
</template>
