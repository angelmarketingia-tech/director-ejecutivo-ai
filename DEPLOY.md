# Despliegue en Vercel — Director Comercial AI (NEXUS HQ)

**Vercel es la mejor opción** para esta app: es el creador de Next.js, da HTTPS
automático, capa gratuita y despliegue nativo. Guía paso a paso.

---

## A) Desplegar el DEMO (sin claves) — seguro y gratis
El modo demo funciona 100% en el navegador; **sin API keys no hay gasto ni envíos
reales**, así que publicarlo es seguro.

### Opción 1 — desde la web (más fácil)
1. Sube el proyecto a un repo de GitHub (o usa "Deploy" subiendo la carpeta).
2. Entra a https://vercel.com → **Add New… → Project** → importa el repo.
3. Framework: **Next.js** (autodetectado). Build: `next build`. No cambies nada.
4. **Deploy**. En ~1 min tendrás una URL `https://tu-proyecto.vercel.app` con HTTPS.

### Opción 2 — desde la terminal
```bash
npm i -g vercel
vercel            # primera vez: login + configurar proyecto
vercel --prod     # despliegue de producción
```

---

## B) Activar agentes REALES + canales (cuando pongas las claves)
En Vercel → tu proyecto → **Settings → Environment Variables**, agrega:

```
NEXT_PUBLIC_DEMO_MODE = false
ANTHROPIC_API_KEY     = sk-ant-...        # tu clave de Claude
AGENT_PRESET          = equilibrada
LIMIT_API_SPEND_USD   = 15

# Seguridad (OBLIGATORIO al exponer en internet)
API_SHARED_SECRET     = <secreto fuerte>  # ver abajo

# Email real (opcional)
RESEND_API_KEY        = re_...
EMAIL_FROM            = "Ventas <ventas@tudominio.com>"
EMAIL_ALLOWED_DOMAINS = tudominio.com,cliente.com

# Otras integraciones (opcional)
GOOGLE_MAPS_API_KEY   = ...
WHATSAPP_ACCESS_TOKEN = ...
WHATSAPP_PHONE_NUMBER_ID = ...
WHATSAPP_VERIFY_TOKEN = ...
WHATSAPP_APP_SECRET   = ...               # verifica la firma del webhook
```

Tu `API_SHARED_SECRET` ya generado (puedes regenerarlo con
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`):

```
API_SHARED_SECRET = 404012958169db6860fec7e7eb7f65b43004e54dd99290a7a01c0a992d861a0b
```

Con `API_SHARED_SECRET` definido, las rutas de agentes y el envío real de email exigen
el header `x-api-secret: <ese valor>`. Tras cambiar variables, **Redeploy**.

---

## ⚠️ IMPORTANTE — Vercel es *serverless* (léelo antes de activar claves)
En Vercel cada función corre en instancias efímeras y separadas. Eso afecta a dos
protecciones que hoy guardan su estado **en memoria**:

- **Tope de gasto diario** (`budget.ts`)
- **Rate limiting** (`security.ts`)

En serverless cada instancia tiene su propia memoria, así que estos contadores **no se
comparten de forma fiable** entre peticiones. Consecuencia: con claves reales activas y
mucho tráfico, el tope de gasto y el rate limit podrían no cortar con precisión.

**Para el demo (sin claves) no importa** — no hay gasto. **Antes de activar
`ANTHROPIC_API_KEY` en producción**, conecta un almacén compartido:

1. Vercel → **Storage → KV** (Upstash Redis) → crea una base (capa gratuita).
2. Vercel inyecta `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. Migrar `budget.ts` y `security.ts` a ese KV (es un cambio pequeño y acotado;
   puedo dejártelo listo cuando lo necesites).

Límites de función: en **Hobby** el tope es 60s (ya configurado). Para corridas largas
de Fable 5 (preset Premium) usa **Pro** y sube `maxDuration` a 300 en
`app/api/agents/*/route.ts`.

---

## Checklist de despliegue seguro
- [ ] Desplegado en Vercel con HTTPS (HSTS ya activo).
- [ ] `NEXT_PUBLIC_DEMO_MODE=false` solo cuando vayas a usar claves reales.
- [ ] `API_SHARED_SECRET` definido antes de exponer endpoints de costo/email.
- [ ] `EMAIL_ALLOWED_DOMAINS` definido para envío real (anti-relay).
- [ ] `WHATSAPP_APP_SECRET` definido si usas el webhook.
- [ ] (Producción con claves) KV conectado para tope de gasto y rate limit fiables.
