<script setup>
// Silueta de alzado (vista de frente o de lado, sin perspectiva) de cada categoría.
// Mismo lienzo (160 × 120), mismo trazo y el piso siempre en y = 104:
// así las cinco se pueden alinear sobre una misma línea de piso.
// El color sale de currentColor: quien la usa decide el tono con una clase text-*.
// El trazo no escala (vector-effect): mide 2px en una miniatura de 72px y en el hero por igual.
defineProps({
  slug: { type: String, required: true },
  // Dibuja la línea de piso bajo el mueble (en las tarjetas; en el hero el piso lo pone la vitrina).
  floor: { type: Boolean, default: false },
})
</script>

<template>
  <svg
    viewBox="0 0 160 120"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    class="[&_*]:[vector-effect:non-scaling-stroke]"
  >
    <path v-if="floor" d="M0 104.5h160" stroke="var(--color-line)" stroke-width="1" />

    <!-- Escritorio: tablero, pedestal de tres gavetas y pata -->
    <g v-if="slug === 'escritorios'">
      <rect x="14" y="42" width="132" height="6" rx="1.5" />
      <rect x="20" y="48" width="40" height="56" />
      <path d="M20 66.5h40M20 85h40M36 57h8M36 75.5h8M36 94.5h8M138 48v56M60 60h78" />
    </g>

    <!-- Silla de oficina: respaldo, asiento, brazos, pistón y base de estrella -->
    <g v-else-if="slug === 'silleria'">
      <rect x="58" y="12" width="44" height="40" rx="10" />
      <rect x="50" y="60" width="60" height="9" rx="4.5" />
      <path d="M80 52v8M46 49h10M50 49v11M104 49h10M110 49v11M80 69v19M80 88 54 97M80 88l26 9M80 88v10" />
      <circle cx="54" cy="100" r="3.5" />
      <circle cx="106" cy="100" r="3.5" />
      <circle cx="80" cy="101" r="3" />
    </g>

    <!-- Comedor: mesa entre dos sillas, vistas de lado -->
    <g v-else-if="slug === 'comedores'">
      <rect x="44" y="56" width="72" height="5" rx="1.5" />
      <path d="M50 61v43M110 61v43" />
      <rect x="22" y="30" width="6" height="26" rx="2" />
      <path d="M22 56v48M22 74h20v30" />
      <rect x="132" y="30" width="6" height="26" rx="2" />
      <path d="M138 56v48M138 74h-20v30" />
    </g>

    <!-- Peinador: tocador con espejo en arco (sirve para salón y para casa) -->
    <g v-else-if="slug === 'peinadores'">
      <path d="M58 54V32a22 22 0 0 1 44 0v22Z" />
      <path d="M69 45 84 30M74 50l17-17" stroke-width="1.5" />
      <path d="M80 54v8" />
      <rect x="34" y="62" width="92" height="5" rx="1.5" />
      <rect x="38" y="67" width="84" height="14" />
      <path d="M80 67v14M56 74h8M96 74h8M42 81v23M118 81v23" />
    </g>

    <!-- Camilla: colchoneta con almohada, patas y travesaño -->
    <g v-else-if="slug === 'camillas'">
      <rect x="16" y="52" width="128" height="9" rx="3" />
      <rect x="22" y="44" width="22" height="8" rx="4" />
      <path d="M30 61v43M130 61v43M30 90h100" />
    </g>

    <!-- Categoría nueva sin silueta: un mueble genérico (gabinete) -->
    <g v-else>
      <rect x="50" y="40" width="60" height="64" rx="1.5" />
      <path d="M50 72h60M74 56h12M74 88h12" />
    </g>
  </svg>
</template>
