<script setup>
import CategorySilhouette from '../product/CategorySilhouette.vue'

// Siluetas de la vitrina: son ilustración (no datos), por eso la lista es fija.
const VITRINE_SLUGS = ['escritorios', 'silleria', 'comedores', 'peinadores', 'camillas']
</script>

<template>
  <!--
    Los muebles de cada categoría sobre el piso del showroom. Ocupa todo el alto y ancho de su
    contenedor: quien lo usa decide la proporción. Es decorativa, por eso aria-hidden.
  -->
  <div class="relative size-full bg-ground" aria-hidden="true">
    <!-- El piso: una franja más clara con su borde como línea de suelo -->
    <div class="absolute inset-x-0 bottom-0 h-[24%] border-t border-line bg-surface/70" />
    <!--
      Las siluetas tienen el piso dibujado en y = 104 de 120: les sobra un 13% abajo.
      Cada una mide el 24% del ancho, así que ese 13% de su alto (¾ del ancho) es ~2.4% del ancho:
      el margen negativo las apoya exactamente sobre la línea. Se montan 2.5% por lado sobre la vecina:
      los dibujos no llenan su lienzo, así que solo se cruzan los márgenes vacíos.
    -->
    <div class="absolute inset-x-0 bottom-[24%] -mb-[2.4%] flex items-end justify-center">
      <CategorySilhouette
        v-for="slug in VITRINE_SLUGS"
        :key="slug"
        :slug="slug"
        class="-mx-[2.5%] w-[24%] text-ink-muted"
      />
    </div>
  </div>
</template>
