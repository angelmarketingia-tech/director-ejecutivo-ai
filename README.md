# NEXUS HQ — Centro de Mando Corporativo 🛰️

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

> Despliegue: ver **[DEPLOY.md](DEPLOY.md)**. Cómo obtener las API keys paso a paso:
> ver **[GUIA_LLAVES.md](GUIA_LLAVES.md)**.

Sala de control tipo videojuego para **toda la compañía**. Un HQ con áreas, donde cada
área tiene **agentes autónomos** (llevan tareas de inicio a fin y **crean subagentes**
para mejorar la calidad, no la velocidad) y, donde aplica, **personas reales** que
marcan qué hacen — la sala muestra su nombre, su actividad y **hace cuánto**.

**Áreas:**
- **HQ / Lobby** — vista general: agentes, subagentes y personas activas de toda la empresa.
- **Comercial** (Director Comercial AI · ATLAS) — SCOUT, ORACLE, FORGE, QUILL, ECHO ejecutan el ciclo de ventas (prospección → cierre) con su sala, pipeline, llamadas, WhatsApp y emails.
- **Marketing** — PRISM, BLAZE, PULSE, BEACON (contenido, pauta, redes, SEO).
- **Directiva · Juntas** — HELM + mesa directiva: KPIs cruzados, juntas y registro de decisiones.
- **Desarrollo** — NOVA, BYTE, LINT, SHIP (arquitectura, implementación, QA, releases).
- **Recursos Humanos** — CARE supervisa a las **personas reales**: presencia, actividad y check-in.

**Agentes + subagentes:** cada agente muestra su tarea de extremo a extremo y, cuando
una segunda perspectiva mejora el resultado, **genera subagentes** (verificador, crítico
de calidad, especialista) visibles en su estación. En la capa real, `lib/agents/subagents.ts`
implementa el patrón borrador → fan-out de críticas → síntesis.

> El proyecto arranca en **modo demo** (datos simulados, sin APIs reales) para ver el
> sistema “vivo” de inmediato. Las integraciones reales se activan con sus API keys.

## ✅ Estado: producto final probado
- **Typecheck** `tsc --noEmit` limpio · **build** de producción OK.
- **16 pruebas E2E (Playwright) en verde** + 1 que se activa sola con `ANTHROPIC_API_KEY`.
- Motor de pipeline **determinista y trazable** (cierra leads por sus atributos reales).
- **Panel de control de agentes** (ON/OFF por agente + subagentes) y **presupuesto que corta**.
- **Persistencia** de configuración (preset, canales, agentes, topes) en el navegador.

## 🚀 Arranque rápido

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev                  # app
npm run e2e                  # 17 pruebas E2E (Playwright levanta la app en :3100)
```

Abre **http://localhost:3000**. Pulsa **En vivo** y observa la operación. Ve a
**Comercial → Configuración / Costos** para elegir preset, modo (con/sin voz), topes de
gasto y **encender/apagar cada agente**. En **Comercial → Sala de Control** usa
*Generar lead* y *Ejecutar pipeline de todos* para cerrar leads de verdad.

### Activar agentes reales (Claude)
Pon en `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`, `AGENT_PRESET=equilibrada`,
`LIMIT_API_SPEND_USD=15`. El indicador en Configuración pasa a **"Claude: conectado"**,
las ejecuciones consumen API real, el presupuesto corta al llegar al tope, y la prueba
E2E de Claude real deja de omitirse. Para email real: `RESEND_API_KEY` + `EMAIL_FROM` +
`NEXT_PUBLIC_DEMO_MODE=false`.

## 🧭 Vistas
- **Sala de Control** — ATLAS central + 5 estaciones + consola + oportunidades calientes + pipeline.
- **Pipeline** — kanban comercial (prospectado → cerrado).
- **Leads** — tabla filtrable con score, temperatura y etapa.
- **Llamadas / WhatsApp / Emails** — registros por canal con estado y cumplimiento.
- **Configuración** — integraciones, nueva campaña y límites de costo.

## 🏗️ Estructura

```
app/
  layout.tsx · page.tsx · globals.css
  api/leads · api/webhooks/whatsapp        # API interna (route handlers)
components/
  Sidebar · Topbar · LeadDrawer · DemoClock
  deck/   MetricsBar · DirectorCore · AgentStation · ActivityConsole · HotLeads · PipelineBoard
  views/  DeckView · LeadsView · CallsView · WhatsAppView · EmailsView · SettingsView
lib/
  types.ts · ui.ts · utils.ts · store.ts   # estado global (Zustand) + simulación
  demo/   data.ts                          # datos demo seguros (ficticios)
  agents/ prompts.ts · orchestrator.ts     # prompts de los 6 agentes + lógica de ATLAS
  integrations/ config · elevenlabs · twilio · whatsapp · email · maps · calendar
prisma/
  schema.prisma · seed.ts                  # modelo de datos completo
.env.example                               # todas las claves, vacías
```

## 🔌 Activar integraciones reales
1. `NEXT_PUBLIC_DEMO_MODE=false` en `.env.local`.
2. Rellena las claves de los proveedores que vayas a usar (ver `.env.example`).
3. Si falta una clave, ese proveedor cae a respuesta simulada (no rompe la app).
4. Base de datos: `npm run db:push && npm run db:seed` (requiere `DATABASE_URL`).

**Modelos de Claude recomendados:** `claude-fable-5` para ATLAS y razonamiento complejo;
`claude-haiku-4-5-20251001` para tareas de alto volumen (prospección/scoring).

### Agentes reales de Claude (Fase 2)
Los workers viven en `lib/agents/` (`claude.ts` cliente + `runAgent`, `schemas.ts`
salida estructurada, `workers.ts` un worker por agente) y se ejecutan vía
`POST /api/agents/run`. Cada agente devuelve **JSON validado** contra su schema.
ATLAS y los agentes de razonamiento usan Fable 5 con *fallback* automático a Opus 4.8
ante un `refusal`; prospección y scoring usan Haiku para alto volumen.

```bash
# Requiere ANTHROPIC_API_KEY en .env.local. Sin clave responde 503 (la sala sigue en demo).
curl -X POST http://localhost:3000/api/agents/run \
  -H "Content-Type: application/json" \
  -d '{"agent":"research","payload":{"company":"La Trattoria","category":"Restaurante","city":"Quito","hasWebsite":false}}'
```

Agentes disponibles: `prospect`, `research`, `scoring`, `email`, `voice`, `director`.

## ⚖️ Cumplimiento (incorporado por diseño)
Opt-in/opt-out por lead, plantillas WhatsApp HSM y ventana de 24h, `List-Unsubscribe`
en emails, horarios de llamada, revisión humana en campañas sensibles y trazabilidad
de cada contacto. Sin scraping agresivo: solo fuentes permitidas (Google Places).

## ✅ Criterios de aceptación
- [x] ATLAS es el orquestador central y visible.
- [x] 5 agentes con funciones distintas y estaciones vivas (estado/tarea/progreso).
- [x] El agente de voz usa ElevenLabs (stub real + TTS en vivo con clave).
- [x] WhatsApp Cloud API contemplado (envío + webhook + cumplimiento).
- [x] Dashboard tipo videojuego, útil y operable.
- [x] Sirve para prospectar, contactar, dar seguimiento y cerrar.
- [x] Cumplimiento legal básico de email/WhatsApp/llamadas.
- [x] Modo demo con datos seguros; APIs reales tras configurar claves.
- [x] Modelo de datos completo (Prisma) y prompts de los 6 agentes.
- [x] MVP construible y ejecutable por un equipo técnico.

## 🧱 Stack
Next.js 14 · React 18 · TypeScript · Tailwind · Framer Motion · Zustand · Recharts ·
Prisma + PostgreSQL. (Producción: Redis/BullMQ + WebSockets para tiempo real.)
```
```

Ver `PROJECT.md` para la especificación completa (arquitectura, flujos, roadmap, riesgos).
