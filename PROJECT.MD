# Director Comercial AI — `Project.md`

> Sala de control comercial multiagente. Un **Director Comercial AI (ATLAS)** orquesta
> 5 agentes autónomos que prospectan, investigan, califican, contactan, hacen
> seguimiento y cierran ventas B2B — con un dashboard tipo videojuego.

---

## 1. Resumen ejecutivo
Plataforma SaaS donde un avatar central (ATLAS) coordina cinco agentes especializados
que ejecutan el ciclo comercial completo sobre pymes y negocios locales. El sistema
encuentra negocios con baja madurez digital (sin web, mala presencia) y les ofrece
servicios (sitio web, automatización, marketing, CRM, agente de llamadas). La operación
se visualiza como una **sala de control** en tiempo real.

## 2. Objetivo principal
Maximizar **reuniones agendadas y cierres de calidad** automatizando prospección →
investigación → scoring → contacto multicanal (email/WhatsApp/voz) → seguimiento →
agendamiento, dejando el cierre de alto valor y la relación final a un humano.

## 3. Problema que resuelve
Las pymes con potencial no son contactadas porque la prospección manual es lenta y cara.
Este sistema industrializa el primer tramo del embudo con cumplimiento legal y trazabilidad.

## 4. Usuarios objetivo
- **Agencias** de marketing/desarrollo web que venden a negocios locales.
- **Equipos comerciales B2B** que necesitan llenar el pipeline.
- **Freelancers/consultores** que quieren un “equipo” comercial automatizado.

## 5. Arquitectura general
```
Frontend (Next.js + Tailwind + Framer Motion)  ──►  Dashboard "Command Deck"
        │  (WebSocket / polling para actividad en vivo)
        ▼
API interna (Next.js Route Handlers)  ──►  Orquestador (ATLAS)
        │                                      │  encola tareas
        ▼                                      ▼
PostgreSQL (Prisma)  ◄──  Workers por agente  ──►  Cola (Redis/BullMQ)
                                  │
                                  ▼
Integraciones externas: Claude API · ElevenLabs · Twilio · WhatsApp Cloud API ·
Resend · Google Places · Google Calendar · Webhooks
```
Cada agente es un worker que recibe tareas del orquestador, llama a Claude con su
prompt de sistema (ver `lib/agents/prompts.ts`) y a las integraciones vía tool-use.

## 6. Director Comercial AI (ATLAS)
Orquestador central. Prioriza la cola global, asigna la siguiente acción por lead,
balancea carga, respeta límites diarios, escala leads calientes a humanos y emite el
reporte ejecutivo. Lógica de coordinación en `lib/agents/orchestrator.ts`.

## 7. Los 5 agentes
| # | Agente | Nombre | Función | Color |
|---|--------|--------|---------|-------|
| 1 | Prospección Web | **SCOUT** | Encuentra negocios (prioriza sin web) vía Google Places | cian |
| 2 | Investigación | **ORACLE** | Reputación, presencia digital, competencia, necesidad | violeta |
| 3 | Captura/Scoring | **FORGE** | Limpia, deduplica, puntúa, clasifica frío/tibio/caliente | ámbar |
| 4 | Email Marketing | **QUILL** | Emails personalizados con promesa, valor, oferta, CTA, seguimiento | esmeralda |
| 5 | Voz y Cierre | **ECHO** | Llamadas (ElevenLabs+Twilio), objeciones, WhatsApp, agenda | rosa |

## 8. Flujo comercial completo
`Prospección (SCOUT)` → `Investigación (ORACLE)` → `Scoring (FORGE)` →
`Contacto: email (QUILL) o llamada (ECHO) según temperatura` → `Interés (engaged)` →
`Reunión (meeting)` → `Escalado a humano` → `Cierre (won)`. Los fríos entran a
secuencias de seguimiento; opt-out sale del flujo inmediatamente.

## 9. Fuentes de datos
Google Places API (negocios), datos públicos de reputación, e importaciones manuales.
**Sin scraping agresivo** ni prácticas que violen términos de servicio.

## 10. Modelo de datos
Definido en `prisma/schema.prisma`: `User`, `Agent`, `Campaign`, `Company`, `Lead`,
`EmailMessage`, `WhatsAppMessage`, `Call`, `Objection`, `Meeting`, `Task`, `Event`,
`AuditLog`, `Integration`.

## 11. Integraciones
Claude (cerebro), ElevenLabs (voz), Twilio (telefonía), WhatsApp Cloud API,
Resend (email), Google Places (prospección), Google Calendar (agenda), Webhooks.
Stubs con modo demo en `lib/integrations/`.

## 12. Reglas de negocio
- Prioriza negocios sin web o con presencia digital débil.
- Caps diarios por canal (control de costos).
- Lead caliente con alto `closeProbability` → llamada/escalado prioritario.
- Sin opt-in válido no se envía email/WhatsApp masivo.

## 13. Scoring de leads
`score = 0.40·oportunidad_digital + 0.25·tracción + 0.25·fit_servicio + 0.10·alcanzabilidad`.
Temperatura: **hot ≥ 72**, **warm 48–71**, **cold < 48**. Implementado en `lib/demo/data.ts`
(demo) y especificado en el prompt de FORGE.

## 14. Flujo de email marketing
Plantilla con: asunto específico, promesa, propuesta de valor por rubro, oferta, prueba,
CTA único, opt-out. Variables dinámicas + secuencia de seguimiento. Ver prompt de QUILL.

## 15. Flujo de llamadas
ECHO genera guion (Claude) → voz (ElevenLabs) → telefonía (Twilio/TwiML o media-stream) →
captura objeciones, interés, próximo paso, fecha de seguimiento, probabilidad de cierre.

## 16. Dashboard y experiencia visual
Estética **"Command Deck"**: puente de mando nocturno, navy profundo, energía cian→violeta,
tipografía Space Grotesk + mono. ATLAS como reactor central con anillos orbitando; 5
estaciones de trabajo vivas (estado, tarea, progreso, cola, producción); consola de
actividad en vivo; pipeline kanban; oportunidades calientes; métricas en tiempo real;
drawer de lead. Animaciones funcionales con Framer Motion.

## 17. Módulos del sistema
Sala de Control · Pipeline · Leads · Llamadas · WhatsApp · Emails · Configuración
(integraciones, campaña, límites) · (futuro) Reportes y Administración.

## 18. Métricas principales
Leads encontrados/calificados, emails, WhatsApp, llamadas, reuniones, cierres, leads
calientes, pipeline ponderado (USD), tasa de conversión, rendimiento por agente.

## 19. Roles y permisos
`OWNER`, `ADMIN`, `OPERATOR`, `VIEWER` (enum en Prisma). Auditoría en `AuditLog`.

## 20–21. Requisitos técnicos y stack
Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Framer Motion · Zustand ·
Recharts · Prisma + PostgreSQL · (prod) Redis/BullMQ + WebSockets. Node 18+.

## 22. APIs necesarias
Claude/Anthropic, ElevenLabs, Twilio, WhatsApp Cloud API, Resend, Google Places,
Google Calendar. Claves en `.env.local` (ver `.env.example`).

## 23. Consideraciones legales y de privacidad
- **Email**: base legal/opt-in, remitente verificado (SPF/DKIM/DMARC), `List-Unsubscribe`.
- **WhatsApp**: plantillas HSM aprobadas, opt-in, ventana 24h, opt-out con STOP.
- **Llamadas**: horarios permitidos, consentimiento, opt-out inmediato, aviso de grabación.
- **Datos**: minimización, sin datos sensibles, derecho de baja, trazabilidad por contacto.
- **Revisión humana** obligatoria en campañas sensibles.

## 24. Roadmap por fases
- **Fase 1 — MVP (este repo):** dashboard + modo demo + modelo de datos + prompts + stubs.
- **Fase 2 — Agentes autónomos:** workers + cola + Claude tool-use reales.
- **Fase 3 — Dashboard avanzado:** WebSockets, mapa de oportunidades, reportes, semi-3D.
- **Fase 4 — Integraciones reales:** ElevenLabs, WhatsApp, Twilio, Resend, Places, Calendar.
- **Fase 5 — Optimización de cierre:** A/B de mensajes, scoring ML, atribución, alertas.

## 25. MVP inicial
Sala de control funcional en **modo demo** (ya entregado): agentes trabajando, leads
entrando, emails/WhatsApp/llamadas registrándose, pipeline moviéndose, métricas vivas.

## 26. Versión avanzada
Integraciones productivas, orquestación con colas, multi-tenant, reportes y panel admin.

## 27. Riesgos
Costo de APIs (mitigado con caps), cumplimiento legal por país, calidad de datos de
Places, deliverability de email, calidad de la voz/latencia en llamadas, reputación de marca.

## 28. Preguntas pendientes
Nicho/ciudad inicial exactos · proveedor de voz definitivo · CRM destino · país(es) y su
marco legal · presupuesto diario de APIs · identidad de marca para los mensajes.

## 29. Checklist de validación
Ver sección “Criterios de aceptación” en `README.md`.

## 30. Criterios de éxito
≥X reuniones agendadas/semana, costo por reunión < umbral, tasa de respuesta sana,
0 incidencias de cumplimiento, y un dashboard que un comercial pueda operar sin manual.
