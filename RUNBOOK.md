# RUNBOOK — Operación y despliegue · Daptux NEXUS HQ (Director Comercial AI)

Guía operativa para correr el producto en producción de forma fiable. Acompaña a
[`AUDITORIA.md`](./AUDITORIA.md) (estado de calidad) y [`DEPLOY.md`](./DEPLOY.md) (alta inicial en Vercel).

---

## 1. Arquitectura en una línea
- **App web (Next.js)** en **Vercel** (serverless, Pro = 300s). UI + APIs + agentes Claude.
- **Persistencia**: **Upstash KV** (leads, equipo, KB, chats WhatsApp, proyectos, gasto…).
- **Conector WhatsApp Web**: proceso **Node local** (carpeta `whatsapp-connector/`), fuera de Vercel.
  Habla con la app por `incoming/outbox/sync` con `API_SHARED_SECRET`.
- **IA**: Claude (`@anthropic-ai/sdk`). **Imágenes**: Higgsfield (API) + Pexels. **Email**: Resend.

## 2. Despliegue
La app se despliega **automáticamente al hacer `git push` a `main`** (integración GitHub↔Vercel).
1. `npx tsc --noEmit && npm run build` deben pasar localmente.
2. `git push origin main` → Vercel construye y publica (~1–2 min).
3. Verifica salud: `GET https://<tu-dominio>/api/health` → `{ ok:true, status:"healthy" }`.

> **Permisos**: el `push` exige acceso *Write* al repo. Si da **403**, la cuenta de git no tiene
> permiso → re-loguéate con la cuenta dueña o concede *Write* (GitHub → repo → Settings → Collaborators).

### Variables de entorno (Vercel → Settings → Environment Variables)
| Variable | Para qué | ¿Obligatoria? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Cerebro de los agentes y el bot | Sí (sin ella, todo "lo dice", no inventa) |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | KV (datos persistentes) | Sí |
| `APP_USER` / `APP_PASSWORD` | Login admin | Sí (activa el gating) |
| `API_SHARED_SECRET` | Auth del conector WhatsApp | Sí (para WhatsApp) |
| `HIGGSFIELD_CREDENTIALS` (`KEY_ID:KEY_SECRET`) | Hero a medida en webs/MVP | Opcional (cae a biblioteca/Pexels) |
| `PEXELS_API_KEY` | Galería de fotos reales | Opcional |
| `RESEND_API_KEY` / `EMAIL_FROM` | Envío de emails | Opcional |
| `SELLER_NAME/_BUSINESS/_PHONE/_PAYMENT` | Firma y datos del vendedor | Opcional |
| `LIMIT_API_SPEND_USD` | Tope de gasto diario de IA | Opcional (default 50) |

`GET /api/health` con **sesión admin** muestra cuáles están configuradas (booleanos, nunca los valores).

## 3. Operar el conector de WhatsApp
- En un equipo **siempre encendido** (PC/VPS), en `whatsapp-connector/`:
  ```bash
  APP_URL=https://<tu-dominio>  API_SHARED_SECRET=<igual-que-vercel>  node index.js
  ```
- Escanea el QR (WhatsApp Business → Dispositivos vinculados) y **deja la ventana abierta**.
- La app muestra **🟢 Conector conectado** (latido) en Comercial → WhatsApp.
- **Anti-baneo (defaults):** 4/min · 40/h · 80/día · cooldown 20s/contacto · ritmo humano · pausa larga ·
  verifica que el número tenga WhatsApp · agrupa ráfagas (1 respuesta) · **envío único** garantizado.
- **Opt-out**: "BAJA/STOP/NO MOLESTAR…" apaga el bot y **bloquea todo envío futuro** a ese contacto.
- Reinicio tras cambios: `Ctrl+C` → `node index.js` (reconecta sin QR; auto-reconecta caídas transitorias).

## 4. Monitoreo y salud
- **Salud**: `GET /api/health`.
- **Gasto de IA**: panel de Directiva / auditoría de tokens por usuario y acción.
- **Logs**: Vercel → Deployments → Functions (runtime logs).
- **Tope de gasto**: si se alcanza `LIMIT_API_SPEND_USD`, los agentes devuelven `budgetExceeded` (degradación elegante).

## 5. Respuesta a incidentes (síntoma → causa → arreglo)
| Síntoma | Causa probable | Arreglo |
|---|---|---|
| WhatsApp no responde | Conector apagado / sesión LOGOUT | Reinicia el conector; reescanea QR si pide |
| "Conector apagado" en la app | Sin latido reciente | Verifica que `node index.js` corre y `API_SHARED_SECRET` coincide |
| Agentes "Falta ANTHROPIC_API_KEY" | Env var ausente | Añádela en Vercel + redeploy |
| Webs sin imágenes | Sin `PEXELS_API_KEY`/Higgsfield | Añade la key; mientras, usa biblioteca curada |
| 401 en APIs | Sin sesión / secreto incorrecto | Inicia sesión; revisa `API_SHARED_SECRET` |
| Todo "lo dice" pero no actúa | Falta una clave | Es el comportamiento honesto: configura la clave |

## 6. Escalado
- App: serverless (escala sola en Vercel). Endpoints IA acotados a 300s (orquestación por partes).
- KV: índices ligeros con tope (leads/proyectos/chats con caps). Para volumen alto, vigilar límites del plan Upstash.
- WhatsApp: **NO** escala con mensajería masiva en frío (riesgo de baneo). Crece con número calentado y volumen diario bajo.

## 7. Riesgos residuales
1. **Conector WhatsApp = punto único local**: si el PC se apaga, WhatsApp se cae. Mitigar con VPS/servicio.
2. **WhatsApp Web no oficial**: minimiza el baneo, no lo elimina. Respeta los topes.
3. **Prueba de carga de KV** bajo tráfico intenso: no medida formalmente (acotado por diseño).
4. **Multi-imagen Higgsfield en vivo**: hoy solo el hero (latencia vs 300s); secundarias por Pexels.
5. **Google Calendar**: stub (no core) — implementar o retirar de la UI si se usa.

## 8. Estado de verificación (última sesión)
`tsc` limpio · `npm run build` limpio · **E2E 66 verde** (2 skipped por claves) · **unit anti-baneo 5/5** ·
**a11y axe 0 violaciones serias** (login+app, claro+oscuro) · **LCP <2.5s medido** · CSP presente · security review sin hallazgos.
