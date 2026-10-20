// Título de la pestaña del navegador.
// Cada página tiene el suyo: así se distinguen en las pestañas, el historial
// y los lectores de pantalla. "Sillería · Mobiliario de Oficina"; sin título, solo la marca.
const SITE_NAME = 'Mobiliario de Oficina'

export function setPageTitle(title) {
  document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
}
