# Director Comercial AI · NEXUS HQ — Guía de Usuarios y Funciones

App en producción: **https://director-ejecutivo-ai.vercel.app**

---

## 1) Usuarios y accesos

> Las contraseñas de abajo son las **por defecto**. Cámbialas en **Vercel → Settings →
> Environment Variables** con la variable indicada (recomendado antes de compartir accesos).

| Persona | Usuario | Contraseña (por defecto) | Variable para cambiarla | Rol |
|---|---|---|---|---|
| Admin (dueño) | `admindaptux` | `daptux2026*` | `APP_USER` / `APP_PASSWORD` | **Admin** |
| Angel (CEO) | `angel` | `angel2026*` | `ANGEL_PASSWORD` | **Admin** |
| David (CEO) | `david` | `david2026*` | `DAVID_PASSWORD` | Miembro |
| Andrés (dev) | `andres` | `andres2026*` | `ANDRES_PASSWORD` | Miembro |
| Juan (dev) | `juan` | `juan2026*` | `JUAN_PASSWORD` | Miembro |

### Permisos por rol
| Acción | Admin | Miembro |
|---|---|---|
| Entrar y ver todo (oficina, áreas, leads, WhatsApp) | ✅ | ✅ |
| Marcar **su** actividad (qué está haciendo) | ✅ | ✅ (solo la suya) |
| Personalizar **su** personaje | ✅ | ✅ (solo el suyo) |
| Editar la actividad/personaje de **otros** | ✅ | ❌ |
| Base de conocimiento del bot (WhatsApp) | ✅ editar | ❌ |
| Auditoría de tokens (gasto de IA) | ✅ | ❌ |
| Facturación (cotizaciones, cobros, MRR) | ✅ | ❌ |
| Pipeline IA, generar webs, agentes | ✅ | ✅ (uso) |

---

## 2) Áreas y funciones

### 🏛️ HQ — Centro de Mando
- **Oficina virtual pixel-art animada**: salas por área, ventanal penthouse con **día/noche** según tu hora local, personajes que teclean, parpadean, **sonríen** y duermen (**Zzz**).
- **🏢 Oficina Daptux**: Angel + David (CEOs, zona VIP) y Andrés + Juan (programadores). Sobre cada uno aparece **qué hace + hace cuánto**, en vivo.
- **Personalizar (PRO)**: editor de personajes — nombre, piel, pelo (color + estilo), barba, gafas, headset (on/off + color), aretes, outfit (camisa/hoodie/traje), gorro. Con vista previa.
- Métricas globales (agentes, subagentes, personas activas).

### 🎯 Comercial
**Sala de Control (Deck):**
- **Buscar leads REALES**: Web (Claude), **Google Places** (con teléfono), **Apify** (tel/email).
- **Ejecutar pipeline con IA (todos)**: ORACLE investiga + FORGE califica + QUILL redacta, por cada lead.
- **Rápido (sin IA)**: investiga/califica/prepara mensaje al instante (gratis).
- **Hot Leads** y **Seguimientos pendientes** (leads sin avanzar).

**Leads:** lista + filtros (caliente/tibio/frío) + búsqueda. Al abrir un lead:
- **Pipeline completo con IA** / **Preparar mensaje (rápido)** / **Investigar con IA**.
- Mensaje listo → **Copiar / Abrir WhatsApp / Email**.
- **Marcar Contactado / Ganado / Perdido** (registro real) · **Escalar a humano**.

**Otras vistas:** Pipeline (tablero), Llamadas, **WhatsApp** (bandeja + bot), Emails, **Configuración** (preset de modelos, canales, topes de gasto, encender/apagar agentes y subagentes).

### 📣 Marketing
- Agentes **PRISM** (contenido), **BLAZE** (ads), **PULSE** (redes), **BEACON** (SEO).
- "Ejecutar" → tarea de inicio a fin con **subagentes** (borrador + críticas). Entregable real.

### 💻 Desarrollo
- **Equipo real**: cada quien marca qué hace (cronómetro), completa tareas con **URL** de la web, y ve su rendimiento.
- **Constructor de proyectos (multi-agente)**: prompt → **Arquitecto (PROJECT.md)** → **Implementador** → **QA**. Vista previa (localhost) + descarga.
- **Crear sitio web (demo)** + **Publicar (link público)** para enviar al cliente por WhatsApp.
- Agentes de área (BYTE, NOVA…).

### 👑 Directiva
- **🧾 Facturación**: crear **cotización** (con link público `/q/...` + WhatsApp + pago Mercado Pago/transferencia), marcar **Pagada**; **Mantenimiento mensual (MRR)**; finanzas (cobrado, por cobrar, MRR, costo de IA).
- KPIs ejecutivos, juntas, agentes (HELM).

### 👥 Recursos Humanos
- Tarjetas del equipo + **check-in** de actividad.

---

## 3) WhatsApp (sin API de Meta)
- **Conector** (carpeta `whatsapp-connector/`): corre en tu PC, escaneas un **QR** con WhatsApp Business.
- **Bandeja** (Comercial → WhatsApp): ves las conversaciones en vivo, **🔥 leads calientes**, y puedes **"Tomar yo"** para responder tú y cerrar.
- **Bot**: responde solo con la **Base de Conocimiento** (servicios, precios, FAQs, manejo de objeciones). Probador integrado.
- Interruptor de **auto-respuesta** ON/OFF · respeta palabra de baja (opt-out).

---

## 4) Páginas públicas (sin login)
- **Demo web**: `…/w/<slug>` — la web que generas para mostrar al cliente.
- **Cotización**: `…/q/<slug>` — propuesta con total y botón de pago/transferencia.

---

## 5) Integraciones (variables en Vercel)
| Para | Variable(s) | ¿Obligatoria? |
|---|---|---|
| IA (agentes, bot, pipeline) | `ANTHROPIC_API_KEY` | **Sí** |
| Datos compartidos (cross-device) | Upstash KV (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) | **Sí** |
| Leads con teléfono | `GOOGLE_MAPS_API_KEY` | Recomendada |
| Leads (tel/email) | `APIFY_TOKEN` | Opcional |
| Fotos reales en webs | `PEXELS_API_KEY` (o `UNSPLASH_ACCESS_KEY`) | Opcional |
| Email automático | `RESEND_API_KEY` + `EMAIL_FROM` | Opcional |
| Cobro con tarjeta/PSE | `MERCADOPAGO_ACCESS_TOKEN` | Opcional |
| Conector WhatsApp (seguridad) | `API_SHARED_SECRET` (mismo en el conector) | Recomendada |
| Firma del vendedor | `SELLER_NAME` / `SELLER_BUSINESS` / `SELLER_PHONE` / `SELLER_PAYMENT` | Opcional |

---

## 6) Flujo recomendado para FACTURAR
1. **Buscar leads REALES** (Google Places) → tu nicho/ciudad.
2. **Pipeline con IA (todos)** → cada lead investigado + mensaje listo (firmado).
3. **Crear sitio web** del prospecto → **Publicar** → mándale el link por WhatsApp.
4. El **bot** responde dudas; cuando hay 🔥 intención, **entras tú** y cierras.
5. **Cotización** (Directiva → Facturación) → link de pago → marcar **Pagada**.
6. Súbelo a **mantenimiento mensual (MRR)** para ingreso recurrente.
7. Revisa **Auditoría de tokens** y **Finanzas** para optimizar.
