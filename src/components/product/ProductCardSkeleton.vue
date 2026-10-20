<template>
  <!--
    Misma forma y medidas que ProductCard: al llegar los datos la grilla no "salta".
    Es decorativo (aria-hidden); el aviso "Cargando" lo da ProductGrid una sola vez.
  -->
  <div class="flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface" aria-hidden="true">
    <div class="aspect-square animate-pulse bg-ground" />

    <div class="flex flex-1 flex-col p-3 md:p-4">
      <!-- Cada barra tiene la altura de la línea de texto que reemplaza -->
      <div class="flex h-[1.4em] items-center text-small">
        <div class="h-2.5 w-1/3 animate-pulse rounded-sm bg-line" />
      </div>
      <div class="mt-1 flex min-h-[2.7em] flex-col justify-around text-card-title">
        <div class="h-3 w-full animate-pulse rounded-sm bg-line" />
        <div class="h-3 w-2/3 animate-pulse rounded-sm bg-line" />
      </div>

      <div class="mt-auto flex items-end justify-between pt-3">
        <div class="w-1/2">
          <div class="flex h-[1.4em] items-center text-small">
            <div class="h-2.5 w-full animate-pulse rounded-sm bg-line" />
          </div>
          <div class="flex h-[1.3em] items-center text-price">
            <div class="h-3.5 w-2/3 animate-pulse rounded-sm bg-line" />
          </div>
        </div>
        <div class="-mr-2 -mb-2 flex size-11 items-center justify-center">
          <div class="size-5 animate-pulse rounded-full bg-line" />
        </div>
      </div>
    </div>
  </div>
</template>
