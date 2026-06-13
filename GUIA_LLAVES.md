# 🔑 Guía de API Keys — paso a paso (fácil)

Una "API key" es como una **llave** que le da permiso a tu app para usar un servicio
(Claude, Google, etc.). Aquí están las 3 llaves que necesitas para que sea funcional, en
orden de importancia. Las pegas en Vercel (no en el código).

> Regla de oro: **la llave es secreta**. No la pegues en chats, ni en el código, ni la
> subas a GitHub. Solo va en **Vercel → Settings → Environment Variables**.

---

## 🧠 Llave 1 — Claude (el cerebro). La más importante.
Sirve para que los agentes piensen, investiguen y redacten.

1. Entra a **https://console.anthropic.com**
2. Crea tu cuenta (o inicia sesión).
3. Arriba a la derecha, ve a **Billing** y agrega una tarjeta. Carga **$10** (con eso
   te sobra para miles de leads).
4. En el menú izquierdo entra a **API Keys**.
5. Botón **Create Key** → ponle un nombre (ej. "nexus") → **Copiar** la llave.
   Empieza con `sk-ant-...`. ⚠️ Solo se muestra una vez: cópiala ya.
6. Esa llave es tu **`ANTHROPIC_API_KEY`**.

---

## 🗺️ Llave 2 — Google Maps / Places (para encontrar negocios REALES)
Sin esto, los leads son inventados. Con esto, trae negocios reales de una ciudad.

1. Entra a **https://console.cloud.google.com**
2. Arriba, crea un **Proyecto nuevo** (botón con el nombre del proyecto → "Nuevo proyecto").
3. Activa la facturación: menú **Billing** → agrega tarjeta. (Las cuentas nuevas suelen
   traer **$300 gratis**; además hay capa gratis mensual.)
4. Busca arriba **"Places API (New)"** y entra → botón **Enable** (Activar).
5. Menú izquierdo → **APIs y servicios → Credenciales**.
6. **Crear credenciales → Clave de API** → se crea y la **copias**.
7. (Recomendado) Clic en la llave → en "Restricciones de API" limita a **Places API**.
8. Esa llave es tu **`GOOGLE_MAPS_API_KEY`**.

---

## ✉️ Llave 3 — Resend (para enviar emails de verdad)
1. Entra a **https://resend.com** y crea tu cuenta.
2. Menú **API Keys** → **Create API Key** → nombre → **Copiar**. Empieza con `re_...`
3. Esa es tu **`RESEND_API_KEY`**.
4. (Para enviar de verdad) en **Domains** agrega tu dominio y sigue los pasos de DNS.
   Mientras tanto puedes probar con el remitente de prueba de Resend.
5. Define también **`EMAIL_FROM`** = `Ventas <ventas@tudominio.com>`

> Email, WhatsApp y voz son OPCIONALES al inicio. Con la Llave 1 (y la 2 para leads
> reales) ya tienes lo esencial funcionando.

---

## 📲 (Opcional, después) WhatsApp / Llamadas
- **WhatsApp**: https://developers.facebook.com → app de WhatsApp → obtienes
  `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`,
  `WHATSAPP_APP_SECRET`.
- **Voz**: `TWILIO_*` (https://twilio.com) + `ELEVENLABS_API_KEY`
  (https://elevenlabs.io). Es el canal más caro; déjalo para el final.

---

## 🧩 Dónde pegar las llaves (en Vercel)
1. Entra a **https://vercel.com** → tu proyecto → **Settings** → **Environment Variables**.
2. Agrega una por una (Name = el nombre en MAYÚSCULAS, Value = la llave). Pega al menos:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_DEMO_MODE` | `false` |
   | `ANTHROPIC_API_KEY` | tu `sk-ant-...` |
   | `AGENT_PRESET` | `equilibrada` |
   | `LIMIT_API_SPEND_USD` | `15` |
   | `API_SHARED_SECRET` | `404012958169db6860fec7e7eb7f65b43004e54dd99290a7a01c0a992d861a0b` |
   | `GOOGLE_MAPS_API_KEY` | tu llave de Google (opcional) |
   | `RESEND_API_KEY` | tu `re_...` (opcional) |
   | `EMAIL_FROM` | `Ventas <ventas@tudominio.com>` (opcional) |
   | `EMAIL_ALLOWED_DOMAINS` | `tudominio.com` (opcional, anti-spam) |

3. Guarda y pulsa **Redeploy** (Deployments → ⋯ → Redeploy). Listo.
4. Verifica: en la app, **Comercial → Configuración / Costos** debe decir
   **"Claude: conectado"**.

> El **tope de gasto** (`LIMIT_API_SPEND_USD`) corta el gasto al llegar al límite, así
> nunca te llevas un susto en la factura. Empieza con `15`.

---

## ✅ Mínimo para que sea funcional HOY
1. `ANTHROPIC_API_KEY` (cerebro) + carga $10.
2. `NEXT_PUBLIC_DEMO_MODE=false`, `AGENT_PRESET=equilibrada`, `LIMIT_API_SPEND_USD=15`,
   `API_SHARED_SECRET=...`.
3. (Para leads reales) `GOOGLE_MAPS_API_KEY`.
4. Redeploy. ¡A operar!
