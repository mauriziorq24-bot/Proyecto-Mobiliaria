<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { company } from '../config/empresa'
import { scrollToHash } from '../utils/scrollToHash'
import { whatsappUrl } from '../utils/whatsapp'

// Contenido de docs/terminos-y-condiciones.md. Si cambia el texto, actualizar también la fecha.
// Los datos de contacto salen de config/empresa.js, igual que en el footer: así nunca se contradicen.
const lastUpdated = { iso: '2026-10-22', text: '22 de octubre de 2026' }

// Títulos de cada sección, por id. El índice y los encabezados leen de aquí,
// así un título no puede quedar distinto en uno y otro. El id es el #ancla de la URL.
const titles = {
  terminos: 'Parte I: Términos y condiciones',
  naturaleza: '1. Naturaleza del sitio',
  precios: '2. Precios, cotizaciones y disponibilidad',
  fotografias: '3. Fotografías, medidas y materiales',
  compra: '4. Cómo se concreta una compra',
  cuentas: '5. Cuentas de usuario',
  citas: '6. Citas en el showroom',
  almacenamiento: '7. Información guardada en su navegador',
  terceros: '8. Servicios de terceros',
  disponibilidad: '9. Disponibilidad del sitio',
  'propiedad-intelectual': '10. Propiedad intelectual',
  modificaciones: '11. Modificaciones y ley aplicable',
  contacto: '12. Contacto',
  privacidad: 'Parte II: Política de privacidad',
  datos: '1. Qué datos recopilamos',
  'uso-de-datos': '2. Para qué los usamos',
  conservacion: '3. Cuánto tiempo los conservamos',
  derechos: '4. Sus derechos',
  seguridad: '5. Seguridad',
}

const index = [
  {
    id: 'terminos',
    sections: [
      'naturaleza',
      'precios',
      'fotografias',
      'compra',
      'cuentas',
      'citas',
      'almacenamiento',
      'terceros',
      'disponibilidad',
      'propiedad-intelectual',
      'modificaciones',
      'contacto',
    ],
  },
  { id: 'privacidad', sections: ['datos', 'uso-de-datos', 'conservacion', 'derechos', 'seguridad'] },
]

// Tocar otra vez el enlace de la sección en la que ya está la URL no es una navegación nueva
// (el router la ignora y no hace scroll): en ese caso se hace a mano.
const route = useRoute()
function goToAgain(id) {
  if (route.hash === `#${id}`) scrollToHash(route.hash, { smooth: true })
}

// Clases repetidas. scroll-mt: al saltar a una sección, el header fijo no tapa su título.
// tabindex="-1" en las secciones: reciben el foco al saltar (ver scrollToHash).
const section = 'scroll-mt-[calc(var(--header-h,0px)+1.5rem)] focus:outline-none'
const sectionTitle = 'text-lg leading-snug font-bold text-ink'
const list = 'mt-3 list-disc space-y-2 pl-5 marker:text-ink-muted'
const link = 'font-semibold text-brand-deep underline underline-offset-4 hover:text-brand-deeper'
</script>

<template>
  <div class="container-page py-8 md:py-12">
    <article class="mx-auto max-w-[70ch] text-ink">
      <header>
        <h1 class="text-headline text-balance">Términos y condiciones</h1>
        <p class="mt-2 text-small text-ink-muted">
          Incluye la política de privacidad · Última actualización:
          <time :datetime="lastUpdated.iso">{{ lastUpdated.text }}</time>
        </p>
        <p class="mt-6">
          Bienvenido/a al sitio web de <strong>{{ company.name }}</strong>. Al acceder, navegar o utilizar este sitio,
          usted acepta estos Términos y Condiciones y nuestra Política de Privacidad. Si no está de acuerdo con alguna
          parte, le pedimos que no utilice el sitio.
        </p>
      </header>

      <!-- Índice -->
      <nav aria-labelledby="terms-index-title" class="mt-8 rounded-md border border-line bg-surface p-5 sm:p-6">
        <h2 id="terms-index-title" class="text-label text-ink-muted uppercase">En esta página</h2>
        <div class="mt-4 grid gap-6 sm:grid-cols-2">
          <div v-for="part in index" :key="part.id">
            <RouterLink :to="{ hash: `#${part.id}` }" :class="link" @click="goToAgain(part.id)">
              {{ titles[part.id] }}
            </RouterLink>
            <ul class="mt-3 space-y-2 text-small">
              <li v-for="id in part.sections" :key="id">
                <RouterLink
                  :to="{ hash: `#${id}` }"
                  class="text-ink-muted underline-offset-4 hover:text-brand-deep hover:underline"
                  @click="goToAgain(id)"
                >
                  {{ titles[id] }}
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <!-- Parte I: Términos y condiciones -->
      <section id="terminos" tabindex="-1" aria-labelledby="terminos-title" class="mt-12" :class="section">
        <h2 id="terminos-title" class="text-title">{{ titles.terminos }}</h2>

        <div class="mt-6 space-y-8">
          <section id="naturaleza" tabindex="-1" aria-labelledby="naturaleza-title" :class="section">
            <h3 id="naturaleza-title" :class="sectionTitle">{{ titles.naturaleza }}</h3>
            <p class="mt-3">
              Este sitio es un <strong>catálogo digital y una herramienta de cotización</strong>. Permite explorar
              nuestro mobiliario, guardar productos favoritos, armar una lista de productos para cotizar, enviar
              solicitudes de cotización y agendar visitas a nuestro showroom.
            </p>
            <p class="mt-3">
              <strong>No somos una tienda con pago en línea:</strong> el sitio no procesa pagos ni concreta ventas. Toda
              venta se acuerda directamente con nuestro equipo.
            </p>
          </section>

          <section id="precios" tabindex="-1" aria-labelledby="precios-title" :class="section">
            <h3 id="precios-title" :class="sectionTitle">{{ titles.precios }}</h3>
            <ul :class="list">
              <li>
                Todos los precios mostrados son <strong>referenciales</strong> y están expresados en dólares
                estadounidenses (USD).
              </li>
              <li>
                El total que muestra "Mi cotización" es una <strong>estimación</strong> y no constituye una oferta
                vinculante.
              </li>
              <li>
                El precio final, la disponibilidad, los costos de envío o instalación y los tiempos de entrega se
                confirman al responder su solicitud de cotización.
              </li>
              <li>Los precios y el catálogo pueden cambiar sin previo aviso.</li>
            </ul>
          </section>

          <section id="fotografias" tabindex="-1" aria-labelledby="fotografias-title" :class="section">
            <h3 id="fotografias-title" :class="sectionTitle">{{ titles.fotografias }}</h3>
            <ul :class="list">
              <li>
                Las fotografías son <strong>referenciales</strong>. El color, la textura y el acabado pueden variar
                según la iluminación y la pantalla de cada dispositivo.
              </li>
              <li>
                Las medidas y materiales indicados son estándar y pueden tener variaciones menores. Le recomendamos
                confirmarlos con un asesor o verlos en persona en nuestro showroom.
              </li>
            </ul>
          </section>

          <section id="compra" tabindex="-1" aria-labelledby="compra-title" :class="section">
            <h3 id="compra-title" :class="sectionTitle">{{ titles.compra }}</h3>
            <p class="mt-3">Usted puede contactarnos con su lista de productos de dos formas:</p>
            <ul :class="list">
              <li>
                <strong>Solicitud de cotización:</strong> envía el formulario del sitio con sus datos y su lista.
                Recibirá un código de cotización y nuestro equipo le responderá por WhatsApp o correo electrónico.
              </li>
              <li>
                <strong>WhatsApp:</strong> el sitio prepara un mensaje con el resumen de su lista, que usted envía desde
                su aplicación de WhatsApp.
              </li>
            </ul>
            <p class="mt-3">
              La negociación final, el pago, la facturación y la entrega se acuerdan directamente con nuestro equipo de
              ventas por los canales oficiales indicados en la
              <RouterLink :to="{ hash: '#contacto' }" :class="link" @click="goToAgain('contacto')">sección 12</RouterLink>.
            </p>
          </section>

          <section id="cuentas" tabindex="-1" aria-labelledby="cuentas-title" :class="section">
            <h3 id="cuentas-title" :class="sectionTitle">{{ titles.cuentas }}</h3>
            <ul :class="list">
              <li>
                <strong>No necesita una cuenta</strong> para explorar el catálogo, guardar favoritos en su dispositivo,
                armar su lista ni solicitar cotizaciones.
              </li>
              <li>
                <strong>Sí necesita una cuenta</strong> para agendar, reprogramar o cancelar citas, y para sincronizar
                sus favoritos entre dispositivos.
              </li>
              <li>Puede crear una cuenta con usuario y contraseña, o iniciar sesión con su cuenta de Google.</li>
              <li>
                Usted es responsable de mantener la confidencialidad de su contraseña y de la actividad realizada con su
                cuenta. Si utiliza una computadora compartida, le recomendamos cerrar sesión al terminar.
              </li>
            </ul>
          </section>

          <section id="citas" tabindex="-1" aria-labelledby="citas-title" :class="section">
            <h3 id="citas-title" :class="sectionTitle">{{ titles.citas }}</h3>
            <ul :class="list">
              <li>Las citas se agendan dentro de nuestro horario de atención y están sujetas a disponibilidad.</li>
              <li>
                Al agendar recibirá un <strong>código de cita</strong>. Puede reprogramarla o cancelarla desde el sitio
                (con su cuenta) o escribiéndonos por WhatsApp con ese código.
              </li>
              <li>
                Podemos reprogramar o cancelar una cita por motivos de fuerza mayor, en cuyo caso se lo notificaremos con
                los datos de contacto que nos proporcionó.
              </li>
            </ul>
          </section>

          <section id="almacenamiento" tabindex="-1" aria-labelledby="almacenamiento-title" :class="section">
            <h3 id="almacenamiento-title" :class="sectionTitle">{{ titles.almacenamiento }}</h3>
            <p class="mt-3">
              Para que el sitio funcione de forma rápida, parte de la información se guarda en el
              <strong>almacenamiento local</strong> de su navegador (no usamos cookies de publicidad ni de seguimiento):
            </p>
            <ul :class="list">
              <li>Su lista de "Mi cotización".</li>
              <li>Sus favoritos. Si inicia sesión, se sincronizan con su cuenta; al cerrar sesión se eliminan de ese navegador.</li>
              <li>Un registro de las citas y cotizaciones que realizó con su cuenta desde ese navegador.</li>
              <li>Su sesión iniciada.</li>
            </ul>
            <p class="mt-3">
              Si borra los datos de navegación, usa otro navegador o cambia de dispositivo, esta información local puede
              no estar disponible.
            </p>
          </section>

          <section id="terceros" tabindex="-1" aria-labelledby="terceros-title" :class="section">
            <h3 id="terceros-title" :class="sectionTitle">{{ titles.terceros }}</h3>
            <p class="mt-3">
              El sitio utiliza servicios de terceros que tienen sus propias condiciones y políticas de privacidad:
            </p>
            <ul :class="list">
              <li><strong>WhatsApp</strong> (Meta), para el envío de mensajes.</li>
              <li><strong>Google</strong>, si elige iniciar sesión con su cuenta de Google.</li>
            </ul>
            <p class="mt-3">No somos responsables del funcionamiento de esos servicios.</p>
          </section>

          <section id="disponibilidad" tabindex="-1" aria-labelledby="disponibilidad-title" :class="section">
            <h3 id="disponibilidad-title" :class="sectionTitle">{{ titles.disponibilidad }}</h3>
            <p class="mt-3">
              Hacemos lo posible para que el sitio esté disponible, pero puede presentar interrupciones, demoras o
              errores. En particular, la primera carga después de un período sin uso puede tardar unos segundos. No
              garantizamos un funcionamiento ininterrumpido.
            </p>
          </section>

          <section id="propiedad-intelectual" tabindex="-1" aria-labelledby="propiedad-intelectual-title" :class="section">
            <h3 id="propiedad-intelectual-title" :class="sectionTitle">{{ titles['propiedad-intelectual'] }}</h3>
            <p class="mt-3">
              Los textos, fotografías, logotipos y el diseño de este sitio pertenecen a {{ company.name }} o se usan con
              autorización. No está permitido reproducirlos o utilizarlos con fines comerciales sin nuestra autorización
              previa por escrito.
            </p>
          </section>

          <section id="modificaciones" tabindex="-1" aria-labelledby="modificaciones-title" :class="section">
            <h3 id="modificaciones-title" :class="sectionTitle">{{ titles.modificaciones }}</h3>
            <p class="mt-3">
              Podemos actualizar estos Términos en cualquier momento; la versión vigente es la publicada en esta página,
              con su fecha de actualización. Estos Términos se rigen por las leyes de la República Bolivariana de
              Venezuela.
            </p>
          </section>

          <!-- Los mismos datos que el footer, desde config/empresa.js. Un dato en null (pendiente) no se muestra. -->
          <section id="contacto" tabindex="-1" aria-labelledby="contacto-title" :class="section">
            <h3 id="contacto-title" :class="sectionTitle">{{ titles.contacto }}</h3>
            <ul :class="list">
              <li>
                <strong>WhatsApp: </strong>
                <a :href="whatsappUrl()" target="_blank" rel="noopener" class="tabular-nums" :class="link">
                  {{ company.whatsapp.display }}<span class="sr-only"> (se abre en otra pestaña)</span>
                </a>
              </li>
              <li>
                <strong>Teléfonos: </strong>
                <template v-for="(phone, i) in company.phones" :key="phone.value">
                  <template v-if="i > 0"> · </template>
                  <a :href="`tel:${phone.value}`" class="tabular-nums" :class="link">{{ phone.display }}</a>
                </template>
              </li>
              <li v-if="company.email">
                <strong>Correo:</strong> <a :href="`mailto:${company.email}`" :class="link">{{ company.email }}</a>
              </li>
              <li>
                <strong>Instagram: </strong>
                <a :href="company.instagram.url" target="_blank" rel="noopener" :class="link">
                  {{ company.instagram.handle }}<span class="sr-only"> (se abre en otra pestaña)</span>
                </a>
              </li>
              <li>
                <strong>Showroom:</strong> <address class="inline not-italic">{{ company.showroom.address }}</address>
              </li>
              <li>
                <strong>Horario: </strong>
                <template v-for="(item, i) in company.showroom.schedule" :key="item.days">
                  <template v-if="i > 0">; </template>
                  {{ i > 0 ? item.days.toLowerCase() : item.days }}, <span class="tabular-nums">{{ item.hours }}</span>
                </template>
              </li>
            </ul>
          </section>
        </div>
      </section>

      <!-- Parte II: Política de privacidad. /privacidad redirige aquí (#privacidad). -->
      <section
        id="privacidad"
        tabindex="-1"
        aria-labelledby="privacidad-title"
        class="mt-12 border-t border-line pt-12"
        :class="section"
      >
        <h2 id="privacidad-title" class="text-title">{{ titles.privacidad }}</h2>

        <div class="mt-6 space-y-8">
          <section id="datos" tabindex="-1" aria-labelledby="datos-title" :class="section">
            <h3 id="datos-title" :class="sectionTitle">{{ titles.datos }}</h3>
            <ul :class="list">
              <li>
                <strong>Al crear una cuenta:</strong> nombre de usuario, correo electrónico y contraseña (la contraseña
                se guarda cifrada). Si inicia sesión con Google, recibimos su nombre y correo de su cuenta de Google.
              </li>
              <li>
                <strong>Al solicitar una cotización:</strong> nombre, empresa (opcional), teléfono, correo electrónico,
                notas y los productos con sus cantidades.
              </li>
              <li>
                <strong>Al agendar una cita:</strong> nombre, empresa (opcional), teléfono, correo electrónico, tipo de
                asesoría, fecha, hora y notas.
              </li>
              <li><strong>Favoritos:</strong> los productos que guarda, si tiene la sincronización con su cuenta.</li>
            </ul>
          </section>

          <section id="uso-de-datos" tabindex="-1" aria-labelledby="uso-de-datos-title" :class="section">
            <h3 id="uso-de-datos-title" :class="sectionTitle">{{ titles['uso-de-datos'] }}</h3>
            <p class="mt-3">Únicamente para:</p>
            <ul :class="list">
              <li>Responder sus solicitudes de cotización.</li>
              <li>Gestionar sus citas en el showroom.</li>
              <li>Mantener su cuenta y sus favoritos.</li>
              <li>Contactarle en relación con esas solicitudes.</li>
            </ul>
            <p class="mt-3">
              <strong>No vendemos, alquilamos ni compartimos sus datos con terceros con fines comerciales.</strong>
            </p>
          </section>

          <section id="conservacion" tabindex="-1" aria-labelledby="conservacion-title" :class="section">
            <h3 id="conservacion-title" :class="sectionTitle">{{ titles.conservacion }}</h3>
            <p class="mt-3">
              Conservamos sus datos mientras su cuenta esté activa o mientras sean necesarios para atender sus
              cotizaciones y citas.
            </p>
          </section>

          <section id="derechos" tabindex="-1" aria-labelledby="derechos-title" :class="section">
            <h3 id="derechos-title" :class="sectionTitle">{{ titles.derechos }}</h3>
            <p class="mt-3">
              Puede solicitarnos en cualquier momento conocer, corregir o eliminar sus datos personales, o eliminar su
              cuenta, escribiéndonos por los canales de contacto de la
              <RouterLink :to="{ hash: '#contacto' }" :class="link" @click="goToAgain('contacto')">sección 12 de los Términos</RouterLink>.
            </p>
          </section>

          <section id="seguridad" tabindex="-1" aria-labelledby="seguridad-title" :class="section">
            <h3 id="seguridad-title" :class="sectionTitle">{{ titles.seguridad }}</h3>
            <p class="mt-3">
              Aplicamos medidas razonables para proteger sus datos, como conexiones cifradas (HTTPS) y contraseñas
              cifradas. Ningún sistema es completamente infalible, por lo que le recomendamos usar una contraseña única
              para este sitio.
            </p>
          </section>
        </div>
      </section>

      <p class="mt-12 border-t border-line pt-6 text-small text-ink-muted italic">
        Al utilizar este sitio, usted confirma que ha leído y aceptado estos Términos y Condiciones y la Política de
        Privacidad.
      </p>
    </article>
  </div>
</template>
