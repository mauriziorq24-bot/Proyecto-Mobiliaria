<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AuthLayout from '../components/layout/AuthLayout.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseFormError from '../components/ui/BaseFormError.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import BasePasswordInput from '../components/ui/BasePasswordInput.vue'
import { useAsync } from '../composables/useAsync'
import { useAuthRedirect } from '../composables/useAuthRedirect'
import { getRegisterConflict } from '../services/authService'
import { submitErrorMessage } from '../services/errorMessages'
import { useAuthStore } from '../stores/auth'

// El backend no valida el formato del correo ni el largo de la contraseña (acepta "1"):
// por ahora lo hace el frontend (pendiente 10-ter de API.md). Esta validación se puede
// saltar desde fuera del navegador; la que protege de verdad es la del backend.
const MIN_PASSWORD_LENGTH = 8
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const auth = useAuthStore()
const { goToRedirect, linkTo } = useAuthRedirect()

const form = reactive({ username: '', email: '', password: '' })
const errors = reactive({ username: '', email: '', password: '' })

// Usuario y correo que el backend ya rechazó por repetidos. Mientras el campo siga
// teniendo ese valor, el error se mantiene aunque la persona salga del campo.
const taken = reactive({ username: '', email: '' })

// Cada regla devuelve el mensaje de error, o '' si el campo está bien.
const rules = {
  username(value) {
    const username = value.trim()
    if (!username) return 'Escribe un nombre de usuario.'
    if (username.toLowerCase() === taken.username) return 'Ese nombre de usuario ya está en uso. Prueba con otro.'
    return ''
  },
  email(value) {
    const email = value.trim()
    if (!email) return 'Escribe tu correo.'
    if (!EMAIL_FORMAT.test(email)) return 'Revisa el correo: debe verse como nombre@ejemplo.com.'
    if (email.toLowerCase() === taken.email) return 'Ese correo ya tiene una cuenta.'
    return ''
  },
  password(value) {
    if (!value) return 'Escribe una contraseña.'
    if (value.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
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

function focusField(field) {
  document.getElementById(`register-${field}`)?.focus()
}

const emailIsTaken = computed(() => Boolean(taken.email) && form.email.trim().toLowerCase() === taken.email)

// useAsync activa el aviso "Estamos despertando el servidor…" si Render tarda más de 5 s.
const { loading, error, execute } = useAsync((datos) => auth.registro(datos), { immediate: false })

// Usuario o correo repetido se muestra en su campo; cualquier otro error, arriba del botón.
const serverError = computed(() => {
  if (!error.value || getRegisterConflict(error.value)) return ''
  return submitErrorMessage(error.value, 'crear tu cuenta')
})

async function handleSubmit() {
  // Un segundo envío crearía la cuenta con la primera petición y recibiría "usuario ya en uso"
  // con la segunda: la sesión quedaría iniciada con un error en pantalla.
  if (loading.value) return
  attempted.value = true
  fields.forEach(validateField)

  const firstInvalid = fields.find((field) => errors[field])
  if (firstInvalid) {
    error.value = null // el error del envío anterior ya no aplica
    focusField(firstInvalid)
    return
  }

  const datos = { username: form.username.trim(), email: form.email.trim(), password: form.password }
  await execute(datos)

  if (!error.value) {
    goToRedirect() // el registro ya deja la sesión iniciada
    return
  }

  const conflict = getRegisterConflict(error.value)
  if (conflict) {
    taken[conflict] = datos[conflict].toLowerCase()
    validateField(conflict)
    await nextTick()
    focusField(conflict)
  }
}
</script>

<template>
  <AuthLayout
    title="Crea tu cuenta"
    separator-text="o con tu correo"
    switch-prompt="¿Ya tienes cuenta?"
    switch-label="Ingresa"
    switch-to="login"
  >
    <!-- novalidate: los mensajes de error los ponemos nosotros, en español y junto a cada campo -->
    <form novalidate class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <BaseInput
        id="register-username"
        v-model="form.username"
        label="Nombre de usuario"
        hint="Podrás ingresar con tu usuario o tu correo."
        :error="errors.username"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        @blur="handleBlur('username')"
      />

      <div class="flex flex-col gap-2">
        <BaseInput
          id="register-email"
          v-model="form.email"
          type="email"
          label="Correo"
          :error="errors.email"
          autocomplete="email"
          spellcheck="false"
          @blur="handleBlur('email')"
        />
        <RouterLink
          v-if="emailIsTaken"
          :to="linkTo('login')"
          class="self-start text-small font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper"
        >
          Ingresar con ese correo
        </RouterLink>
      </div>

      <BasePasswordInput
        id="register-password"
        v-model="form.password"
        label="Contraseña"
        :hint="`Al menos ${MIN_PASSWORD_LENGTH} caracteres.`"
        :error="errors.password"
        autocomplete="new-password"
        @blur="handleBlur('password')"
      />

      <BaseFormError v-if="serverError">{{ serverError }}</BaseFormError>

      <BaseButton type="submit" block :loading="loading" class="mt-2">Crear cuenta</BaseButton>
    </form>
  </AuthLayout>
</template>
