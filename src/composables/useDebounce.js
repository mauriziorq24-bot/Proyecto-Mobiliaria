import { onScopeDispose, readonly, ref, toValue, watch } from 'vue'

// Devuelve una copia de `source` que solo se actualiza cuando `source` deja de
// cambiar durante `delay` ms. Mientras la persona escribe "silla", el valor original
// pasa por "s", "si", "sil"…; la copia espera a que haga una pausa y cambia una sola vez.
//
// Uso:
//   const texto = ref('')
//   const textoDebounced = useDebounce(texto, 300)
//   watch(textoDebounced, (valor) => buscar(valor))
//
// `source` puede ser un ref, un computed o una función getter (() => props.valor).
export function useDebounce(source, delay = 300) {
  const debounced = ref(toValue(source))
  let timer = null

  watch(
    () => toValue(source),
    (value) => {
      // Cada cambio reinicia la cuenta: solo sobrevive el último.
      clearTimeout(timer)
      timer = setTimeout(() => {
        debounced.value = value
      }, delay)
    },
  )

  // Si el componente se desmonta con un temporizador pendiente, se cancela.
  onScopeDispose(() => clearTimeout(timer))

  // De solo lectura: el valor lo decide `source`, nadie debe cambiarlo desde fuera.
  return readonly(debounced)
}
