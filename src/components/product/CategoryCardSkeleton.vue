<template>
  <!-- Misma forma y medidas que CategoryCard, para que nada salte al llegar los datos -->
  <div
    class="flex h-full items-center gap-4 overflow-hidden rounded-md border border-line bg-surface p-3 md:flex-col md:items-stretch md:gap-0 md:p-0"
    aria-hidden="true"
  >
    <div class="aspect-square w-[72px] shrink-0 animate-pulse rounded-sm bg-ground md:aspect-[4/3] md:w-full md:rounded-none" />

    <div class="min-w-0 flex-1 md:px-4 md:pt-3 md:pb-4">
      <div class="flex h-[1.35em] items-center text-card-title">
        <div class="h-3 w-1/2 animate-pulse rounded-sm bg-line" />
      </div>
      <div class="mt-0.5 flex h-[2.8em] flex-col justify-around text-small md:hidden lg:flex">
        <div class="h-2.5 w-full animate-pulse rounded-sm bg-line" />
        <div class="h-2.5 w-3/4 animate-pulse rounded-sm bg-line" />
      </div>
    </div>

    <div class="size-5 shrink-0 md:hidden" />
  </div>
</template>
