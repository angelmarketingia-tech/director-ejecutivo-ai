# Daptux.IA — Landing Page

## Objetivo
Crear una landing page de una sola página, moderna y sobria, para **Daptux.IA**, agencia colombiana que diseña y desarrolla sitios web para negocios. El objetivo es presentar la propuesta de valor, los servicios principales y facilitar el contacto directo vía WhatsApp.

## Usuarios
- Dueños de negocios pequeños y medianos en Colombia que buscan presencia digital.
- Emprendedores que quieren un sitio web profesional sin complicaciones técnicas.

## Stack
- **Un solo archivo HTML autónomo** (`index.html`) con CSS y JavaScript embebidos.
- Sin frameworks ni dependencias externas.
- Fuentes del sistema (`system-ui`, `sans-serif`) para cero peticiones externas.
- Paleta sobria: fondo oscuro (`#0d0d0d`), acento en verde eléctrico (`#00e676`), texto en blanco y grises.

## Páginas / Secciones
1. **Header / Nav** — Logo textual `Daptux.IA` + ancla al formulario de contacto.
2. **Hero** — Titular impactante, subtítulo de propuesta de valor y botón CTA que abre WhatsApp.
3. **Servicios** — Grid de 3 tarjetas con ícono SVG inline, título y descripción breve.
4. **Contacto** — Texto de invitación + botón grande de WhatsApp con número configurable.
5. **Footer** — Copyright y tagline.

## Componentes

### Header
- Logo textual con acento de color en `.IA`.
- Botón/enlace `Contáctanos` que hace scroll suave a la sección de contacto.

### Hero
- `<h1>` titular: *"Tu negocio merece una presencia digital que vende"*
- `<p>` subtítulo: *"Creamos sitios web profesionales para empresas colombianas. Rápidos, modernos y a tu medida."*
- Botón CTA primario: *"Empieza hoy →"* — enlaza a WhatsApp con mensaje predefinido.
- Fondo con gradiente oscuro sutil o patrón de puntos CSS.

### Tarjetas de Servicios
Grid responsive de 3 columnas (colapsa a 1 en móvil):
| # | Servicio | Descripción |
|---|----------|-------------|
| 1 | Sitios Web Empresariales | Diseño profesional adaptado a tu marca y sector. |
| 2 | Tiendas en Línea | Vende 24/7 con un e-commerce optimizado y fácil de gestionar. |
| 3 | Optimización y SEO | Aparece primero en Google y atrae clientes de forma orgánica. |

Cada tarjeta incluye: ícono SVG inline, `<h3>` y `<p>`.

### Sección Contacto
- Párrafo de invitación cálido.
- Botón prominente con ícono de WhatsApp SVG inline.
- Número configurable mediante constante JS `WHATSAPP_NUMBER`.
- Mensaje predefinido en la URL de wa.me.

### Footer
- Texto: `© 2025 Daptux.IA — Todos los derechos reservados.`

## Datos / Estado
- **`WHATSAPP_NUMBER`** (constante JS): número colombiano en formato internacional, p. ej. `573001234567`.
- **`WHATSAPP_MESSAGE`** (constante JS): mensaje URL-encoded que se envía al abrir WhatsApp.
- Sin estado dinámico adicional; la página es 100 % estática.
- Scroll suave manejado con CSS `scroll-behavior: smooth` y JS mínimo para el menú si aplica.

## Criterios de aceptación
- [ ] El archivo es un único `index.html` autónomo que abre correctamente sin servidor.
- [ ] La página muestra correctamente las secciones: Hero, Servicios y Contacto.
- [ ] El titular y subtítulo del Hero son legibles y visualmente prominentes.
- [ ] El botón CTA del Hero abre WhatsApp con el número y mensaje configurados.
- [ ] Las 3 tarjetas de servicios se muestran en grid de 3 columnas en escritorio.
- [ ] Las tarjetas colapsan a 1 columna en pantallas menores a 600 px.
- [ ] Cada tarjeta tiene ícono SVG, título y descripción.
- [ ] La sección de Contacto tiene un botón de WhatsApp funcional.
- [ ] El número de WhatsApp es fácilmente configurable en una sola constante JS.
- [ ] El diseño usa paleta oscura con acento en verde eléctrico, coherente en toda la página.
- [ ] La navegación hace scroll suave a la sección de contacto.
- [ ] La página es responsive y usable en móvil (mínimo 320 px de ancho).
- [ ] No hay dependencias externas (sin Google Fonts, sin CDN, sin imágenes remotas).
- [ ] El footer muestra el copyright correcto.
- [ ] El código HTML es semánticamente correcto (uso de `<header>`, `<main>`, `<section>`, `<footer>`).
