import { Briefcase, House, Scissors, Shapes, Stethoscope } from 'lucide-vue-next'
import { etiquetaTipoEspacio, OPCIONES_TIPO_ESPACIO } from '../utils/formato'

// Único mapa de la apariencia de cada tipoEspacio (DESIGN.md › Muestras).
// Cada ambiente se reconoce por su ícono y su nombre, no solo por el color.
// Contraste del nombre (700 · 14px) sobre la muestra, medido: todos cumplen AA (≥ 4.5:1).
// Las clases van escritas completas para que Tailwind las encuentre al compilar.
const ESTILOS = {
  OFICINA: { icon: Briefcase, swatchClass: 'bg-swatch-oficina text-white' }, // 5.8:1
  HOGAR: { icon: House, swatchClass: 'bg-swatch-hogar text-white' }, // 5.0:1
  SALON_BELLEZA: { icon: Scissors, swatchClass: 'bg-swatch-salon-belleza text-white' }, // 13.4:1
  // Gris Claro casi no se separa del fondo: lleva borde de 1px.
  CONSULTORIO: { icon: Stethoscope, swatchClass: 'bg-swatch-consultorio text-ink border border-ink/15' }, // 11.5:1
}

// Un tipo nuevo que el backend agregue sin entrada en el mapa: Gris Oxford y un ícono genérico.
const ESTILO_DESCONOCIDO = { icon: Shapes, swatchClass: 'bg-swatch-fallback text-white' } // 4.5:1 (justo en el límite de AA)

export function estiloTipoEspacio(valor) {
  return { valor, etiqueta: etiquetaTipoEspacio(valor), ...(ESTILOS[valor] ?? ESTILO_DESCONOCIDO) }
}

// Los cuatro valores de API.md, en orden, con su etiqueta, ícono y color.
export const TIPOS_ESPACIO = OPCIONES_TIPO_ESPACIO.map(({ valor }) => estiloTipoEspacio(valor))
