<script setup>
import { CalendarCheck, ChevronDown, Clock, Instagram, MapPin, MessageCircle, Phone } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'
import { RouterLink } from 'vue-router'
import logoUrl from '../../assets/logo.png'
import { useCategorias } from '../../composables/useCategorias'
import { company, whatsappUrl } from '../../config/empresa'
import BaseButton from '../ui/BaseButton.vue'

const { categorias, loading, error } = useCategorias()

// DESIGN.md: el footer muestra como máximo 6 categorías.
const footerCategorias = computed(() => categorias.value.slice(0, 6))

// En móvil, "Catálogo" es un acordeón; desde tablet siempre está abierto.
const catalogOpen = ref(false)
const catalogId = useId()

const year = new Date().getFullYear()

// Franja superior con los colores de las muestras de tipo de espacio.
const stripe = [
  'bg-swatch-oficina',
  'bg-swatch-hogar',
  'bg-swatch-salon-belleza',
  'bg-swatch-consultorio',
  'bg-swatch-fallback',
]

const heading = 'mb-4 text-label text-white/60 uppercase'
const link = 'text-white/80 transition-colors duration-200 ease-out hover:text-white focus-visible:outline-white'
</script>

<template>
  <footer class="bg-footer-mesh text-white">
    <div class="flex h-1" aria-hidden="true">
      <span v-for="color in stripe" :key="color" class="flex-1" :class="color" />
    </div>

    <div class="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-4 lg:gap-8 lg:px-8">
      <!-- Marca (desde tablet; en móvil ya está en el header) -->
      <section class="hidden md:order-1 md:block">
        <RouterLink to="/" class="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-white">
          <img :src="logoUrl" alt="" width="40" height="40" class="size-10 rounded-md" />
          <span class="text-[1.1875rem] leading-[1.05] font-extrabold tracking-[-0.01em]">
            Mobiliario<br />de Oficina
          </span>
        </RouterLink>
        <p class="mt-4 max-w-[34ch] text-small text-white/70">{{ company.tagline }}</p>
        <a
          :href="company.instagram.url"
          target="_blank"
          rel="noopener"
          class="mt-5 inline-flex items-center gap-2 text-small font-semibold"
          :class="link"
        >
          <Instagram class="size-[18px]" aria-hidden="true" />
          {{ company.instagram.handle }}
        </a>
      </section>

      <!-- Catálogo -->
      <section class="order-3 md:order-2">
        <h2 :class="heading" class="hidden md:block">Catálogo</h2>
        <h2 class="md:hidden">
          <button
            type="button"
            class="-mx-1 flex w-[calc(100%+0.5rem)] items-center justify-between rounded-md px-1 py-2 text-label text-white/60 uppercase focus-visible:outline-white"
            :aria-expanded="catalogOpen"
            :aria-controls="catalogId"
            @click="catalogOpen = !catalogOpen"
          >
            Catálogo
            <ChevronDown
              class="size-[18px] transition-transform duration-200 ease-out"
              :class="catalogOpen && 'rotate-180'"
              aria-hidden="true"
            />
          </button>
        </h2>
        <ul :id="catalogId" class="space-y-3 text-small max-md:mt-2" :class="catalogOpen ? 'block' : 'max-md:hidden'">
          <li v-if="loading" class="text-white/60">Cargando…</li>
          <template v-else-if="!error">
            <li v-for="categoria in footerCategorias" :key="categoria.id">
              <RouterLink :to="`/categoria/${categoria.slug}`" :class="link">{{ categoria.nombre }}</RouterLink>
            </li>
          </template>
          <li>
            <RouterLink
              :to="{ name: 'search', query: { enShowroom: 'true' } }"
              class="inline-flex items-center gap-2"
              :class="link"
            >
              <span class="size-2 rounded-full bg-showroom-gold" aria-hidden="true" />
              En showroom
            </RouterLink>
          </li>
        </ul>
      </section>

      <!-- Showroom -->
      <section class="order-1 md:order-3">
        <h2 :class="heading">Showroom</h2>
        <ul class="space-y-3 text-small text-white/80">
          <li class="flex gap-2.5">
            <MapPin class="mt-px size-[18px] shrink-0 text-white/60" aria-hidden="true" />
            <address class="not-italic">{{ company.showroom.address }}</address>
          </li>
          <li class="flex gap-2.5">
            <Clock class="mt-px size-[18px] shrink-0 text-white/60" aria-hidden="true" />
            <dl class="space-y-1">
              <div v-for="item in company.showroom.schedule" :key="item.days">
                <dt class="inline">{{ item.days }}:</dt>
                <dd class="inline tabular-nums">{{ ' ' + item.hours }}</dd>
              </div>
            </dl>
          </li>
        </ul>
        <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <BaseButton to="/agendar-cita" variant="visit" class="max-md:w-full">
            <template #icon-left><CalendarCheck /></template>
            Agendar visita
          </BaseButton>
          <a
            v-if="company.showroom.mapsUrl"
            :href="company.showroom.mapsUrl"
            target="_blank"
            rel="noopener"
            class="text-small font-semibold underline"
            :class="link"
          >
            Cómo llegar
          </a>
        </div>
      </section>

      <!-- Contacto -->
      <section class="order-2 md:order-4">
        <h2 :class="heading">Contacto</h2>
        <BaseButton
          :href="whatsappUrl()"
          target="_blank"
          rel="noopener"
          variant="whatsapp"
          class="max-md:w-full"
        >
          <template #icon-left><MessageCircle /></template>
          Escribir por WhatsApp
        </BaseButton>
        <ul class="mt-5 space-y-3 text-small">
          <li v-for="phone in company.phones" :key="phone.value">
            <a :href="`tel:${phone.value}`" class="inline-flex items-center gap-2.5 tabular-nums" :class="link">
              <Phone class="size-[18px] text-white/60" aria-hidden="true" />
              {{ phone.display }}
            </a>
          </li>
          <li v-if="company.email">
            <a :href="`mailto:${company.email}`" :class="link">{{ company.email }}</a>
          </li>
          <li>
            <a
              :href="company.instagram.url"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2.5"
              :class="link"
            >
              <Instagram class="size-[18px] text-white/60" aria-hidden="true" />
              {{ company.instagram.handle }}
            </a>
          </li>
        </ul>
      </section>
    </div>

    <div class="border-t border-white/10">
      <p class="mx-auto w-full max-w-[1280px] px-4 py-6 text-small text-white/60 md:px-6 lg:px-8">
        © {{ year }} {{ company.name }} · Los precios son referenciales; el precio final se confirma en la cotización.
      </p>
    </div>
  </footer>
</template>
