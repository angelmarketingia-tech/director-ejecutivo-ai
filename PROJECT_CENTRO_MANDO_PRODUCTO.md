# PROJECT.md — GANAPLAY · Centro de Mando del Director de Producto

> Aplicación tipo **centro de mando interactivo** (oficina pixel-art viva, con ambiente
> dinámico) para que el **Director de Producto** de **GANAPLAY** (casa de apuestas y
> casino en línea) vea, en tiempo real y de forma **real (no simulada)**, qué hace cada
> persona y cada agente de su equipo, reciba alertas cuando hay una novedad, **hable con
> todo su equipo por WhatsApp** desde la misma app y resuelva sin salir del tablero.

---

## 1. Objetivo

Una sola pantalla — la **oficina GANAPLAY** — donde el Director ve toda su operación viva:

- **Personas reales** trabajando por áreas (Marketing, Pauta, SAC, Contabilidad), cada una con su **login**, que reportan su actividad y **levantan novedades/alertas** cuando necesitan algo del Director.
- **4 agentes de IA** en el área de **Producto**, que trabajan solos (promociones, artes, calendario deportivo y coordinación).
- **Comunicación bidireccional interna**: cuando alguien tiene un problema, aparece una **alarma** en el tablero del Director; él responde y **la novedad no se cierra hasta marcarse resuelta**.
- **WhatsApp del equipo**: todos tienen **número corporativo**; el Director puede **chatear con cualquiera por WhatsApp** desde la app, simulando el **WhatsApp Web** que ya usamos (vía conector anti-baneo). **Solo el Director** responde/escribe por ahí; el "modo agente" (IA redacta/responde) es **opcional y apagado por defecto**.
- **Oficina con ambiente dinámico**: la escena cambia (mañana/tarde/noche, luces, clima, "hora pico") como en el centro de mando base, con el máximo de detalles. **Modo PRO**.

> Principio clave (heredado): **nada falso**. Si un dato no existe, se muestra vacío/"sin
> actividad", nunca se inventa actividad, conversaciones ni resultados.

---

## 2. Roles y usuarios

Cada **persona** tiene su propio usuario/contraseña (login individual) y un **número
corporativo de WhatsApp** asociado.

| Área | Personas | Rol | Qué puede hacer |
|---|---|---|---|
| **Dirección** | Director de Producto | **admin** | Ve TODA la oficina y áreas; ve y resuelve todas las alertas; chatea por WhatsApp con todo el equipo; ve KPIs, agentes y finanzas. |
| **Marketing** | Fernanda (Community Manager) · Juan, Verónica, Eliana (Diseño) | member | Reportan actividad, levantan novedades, reciben respuestas, ejecutan tareas/artes. |
| **Pauta** | Encargado/a de Pauta (+ equipo de pauta) | member | Gestiona campañas pagadas (Meta/Google/etc.), reporta pauta activa, presupuesto, resultados; levanta novedades. |
| **SAC (Atención al cliente)** | Álvaro + 3 (4 en total) | member | Levantan consultas de usuarios al Director ("llegó un cliente con esta duda"), reciben indicación y marcan listo. |
| **Contabilidad** | 4 personas | member | Reportan actividad y novedades (pagos, retiros, conciliaciones); levantan alertas. |
| **Producto (IA)** | 4 agentes | (no son personas) | Trabajan autónomos; su salida se ve en el tablero del Director. |

> **Nota de Pauta**: se modela como **área propia** y, además, su responsable aparece en
> coordinación con Marketing (artes/campañas comparten flujo).
> Permisos: cada usuario **solo edita lo suyo**; el Director ve y actúa sobre todo (RBAC).

---

## 3. La oficina (pantalla principal) — pixel-art con ambiente dinámico

Render **pixel-art animado**, vista frontal, **misma estética y motor del proyecto base**
(canvas + avatares personalizables: nombre, apariencia máxima, expresiones, accesorios).

### Salas/áreas
```
┌────────────────────────────────────────────────────────────────────┐
│  GANAPLAY · Centro de Mando de Producto         ☀️/🌙  hora 14:32     │
│                                                                      │
│  ┌── MARKETING ─────────────┐   ┌── PRODUCTO (IA) ─────────────────┐ │
│  │ Fernanda (CM)            │   │ 🤖 Promociones                   │ │
│  │ Juan · Verónica · Eliana │   │ 🤖 Artes (copy+imagen)           │ │
│  │ (diseño)                 │   │ 🤖 Calendario deportivo          │ │
│  └──────────────────────────┘   │ 🤖 Coordinador                   │ │
│  ┌── PAUTA ─────────────────┐   └──────────────────────────────────┘ │
│  │ Encargado/a de pauta +   │                                        │
│  │ equipo (campañas)        │   ┌── SAC ──────────┐ ┌─ CONTABILIDAD ─┐│
│  └──────────────────────────┘   │ Álvaro + 3      │ │ 4 personas     ││
│                                  └─────────────────┘ └────────────────┘│
│   🟢 trabajando  🟡 inactivo  🔴 NOVEDAD/ALERTA   💬 WhatsApp activo  │
└────────────────────────────────────────────────────────────────────┘
```

- Sobre cada personaje: **estado en vivo** ("Diseñando arte promo finde", "Atendiendo retiro", "Optimizando campaña Meta") + **anillo de color** por estado.
- **Novedad** → el personaje **parpadea en rojo** con globo `❗`; clic → abre el hilo.
- Indicador `💬` si hay conversación de WhatsApp pendiente con esa persona.
- Mostrar actividad en vivo es **opcional** (toggle).

### Ambiente dinámico (PRO) — "que la oficina cambie de ambiente"
- **Ciclo día/noche** según hora real (Colombia): amanecer, día, atardecer, noche → cambian luces, color del cielo por las ventanas, lámparas encendidas de noche.
- **Estados de oficina**: "hora pico" (más movimiento/animación), "tranquilo", "modo evento deportivo" (cuando hay un evento relevante del calendario → ambiente especial GANAPLAY).
- **Detalles vivos**: pantallas internas con tickers, partículas, cafés, plantas, reloj real, clima opcional, micro-animaciones (teclear, mirar pantalla, estirarse, café).
- **Branding GANAPLAY**: paleta y logo en el ambiente (sin inventar marca, usar la real).
- Sonido ambiente opcional + **sonido de alerta** al entrar una novedad/WhatsApp.

---

## 4. Sistema de novedades / alertas (corazón de la app)

1. Cualquier persona crea una **Novedad**: `{ tipo, área, título, descripción, prioridad, adjuntos? }`.
   - Ej. SAC: "Cliente pide reembolso de depósito duplicado, ¿qué le digo?"
   - Ej. Pauta: "CPA disparado en campaña casino, ¿pauso o subo presupuesto?"
2. En el tablero del Director **suena/aparece alarma** y el personaje se pone en rojo.
3. Se abre **hilo de chat** (interno) entre la persona y el Director — tiempo real, bidireccional.
4. El Director responde / adjunta indicaciones.
5. **Estados**: `abierta → en_proceso → resuelta`. **No se cierra** hasta marcarse resuelta.
6. Queda **historial** por persona y por área (auditoría).

Prioridades: `baja`, `media`, `alta`, `urgente`.

---

## 5. WhatsApp del equipo (Director ↔ personas) — simulando nuestro WhatsApp Web

Objetivo: que el Director **hable con todo su equipo por WhatsApp** desde la app, usando
los **números corporativos**, **igual que el WhatsApp Web** que ya usamos.

- **Conector WhatsApp Web** (no oficial, anti-baneo) reutilizado del proyecto base:
  marca "visto", "escribiendo…", esperas humanas, límites por minuto/hora/día. Idealmente
  sobre un **número corporativo de GANAPLAY ya calentado**.
- **Bandeja interna**: el Director ve la lista de **chats con cada miembro del equipo**
  (mapeados por número corporativo → usuario/área), historial y estado.
- **Solo el Director** responde/escribe por WhatsApp (es su canal de mando). Los miembros
  no operan WhatsApp desde la app; ellos usan la app para **novedades** (sección 4).
- **Modo agente (OPCIONAL, OFF por defecto)**: la IA puede **redactar borradores** o
  **auto-responder** mensajes rutinarios al equipo; toggle por chat. La idea base es que
  **solo el Director** se comunique; el agente es asistencia, nunca obligatorio.
- **Base de conocimiento** editable para los borradores del agente (tono GANAPLAY, datos
  internos, FAQs del equipo) + carga de archivos.
- **Anti-baneo blindado**: nunca envíos masivos/en frío; solo conversación 1-a-1 con el equipo.
- **Vínculo con novedades**: desde una novedad el Director puede "Responder por WhatsApp"
  a la persona; desde un chat puede "Crear novedad".

> Diferencia clave con la sección 4: **Novedades = comunicación interna dentro de la app**
> (cualquiera la inicia). **WhatsApp = canal externo de mando** (solo el Director).

---

## 6. Área de Producto — los 4 agentes de IA

Agentes reales (Claude), trabajan en segundo plano y reportan al tablero del Director.

### Agente 1 — Promociones
- Busca **nuevas promociones** posibles de forma continua.
- **Evalúa promociones existentes** (rendimiento, claridad, condiciones, fricción).
- Vigila **promociones de la competencia**.
- Detecta **cuellos de botella** en el flujo de la promo.
- Salida: oportunidades priorizadas + alerta "promo de competencia detectada".

### Agente 2 — Artes (con subagentes)
- **Copywriter**: copies del arte (titular, bajada, CTA, T&C corto) en tono GANAPLAY.
- **Diseño de imagen**: genera/propone la imagen (vía Higgsfield u otro), con preflight de costo.
- **Evaluador de impacto**: juzga si la imagen es **impactante** (contraste, foco, claridad).
- **Variaciones**: propone variaciones para la **siguiente pieza de la misma promoción**.
- Salida: paquete (copy + imagen + score + variaciones) → cae en tareas de Marketing/Pauta.

### Agente 3 — Calendario deportivo (fuente: `calendario.ganaplay.lat`)
- Se conecta a **`calendario.ganaplay.lat`** (calendario propio de GANAPLAY).
- Lista **todos los eventos relevantes** con **descripción de cada evento** y
  **clasificación por relevancia** (alta/media/baja u otro criterio del feed).
- Vigila **próximos eventos** y **recuerda** al equipo ("Partido clave en 48h → preparar promo + pauta + arte").
- Dispara el **"modo evento deportivo"** del ambiente de la oficina cuando hay un evento de alta relevancia.
- Salida: agenda priorizada + recordatorios que generan tareas/alertas.
- Integración: feed/API de `calendario.ganaplay.lat` (definir endpoint/scrape autorizado); cachear en KV.

### Agente 4 — Coordinador
- **Ve qué está haciendo cada uno** (personas y agentes), resume el estado de cada área.
- Detecta tareas atascadas/novedades sin atender y **avisa al Director**.
- Salida: resumen ejecutivo + señales "esto necesita tu atención".

> Límite técnico (Vercel): respetar tope de ejecución (Hobby 60s / **Pro 300s**). Agentes
> pesados → orquestación cliente (1 tarea por llamada), como en el base.

---

## 7. Tareas interactivas (Marketing + Pauta)

- Tablero por área: `pendiente → en curso → revisión → hecha`.
- Artes del Agente 2 caen en **Marketing** (diseño) y disparan **Pauta** (campaña).
- Recordatorios del Agente 3 generan tareas "preparar evento X".
- El Director ve avance **en tiempo real**, comenta y aprueba.
- Todos los miembros son **interactivos**: su estado y tareas se reflejan en su personaje.

---

## 8. KPIs y resumen para el Director

- Novedades **abiertas / urgentes** ahora; chats de WhatsApp pendientes.
- Actividad por área (personas activas, tareas en curso).
- **Pauta**: campañas activas, presupuesto/gasto, resultados (sin inventar; lo que el equipo cargue).
- **Producto**: promos en evaluación, artes generados hoy, próximos eventos deportivos.
- **Resumen del día** (qué pasó, qué quedó pendiente) — real, sin fabricar.

---

## 9. Arquitectura técnica (misma familia que el proyecto base)

- **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind.
- **Estado cliente**: Zustand (persist). **Animación**: Canvas (oficina + ambiente) + Framer Motion.
- **Persistencia**: Upstash KV (REST) — todo en servidor (cross-device, sobrevive recargas):
  usuarios, estados en vivo, novedades+hilos, tareas, salida de agentes, chats WhatsApp, KB.
- **Tiempo real**: polling corto (3–5s) sobre novedades/estados/WhatsApp (robusto, como el base) o SSE.
- **IA**: `@anthropic-ai/sdk` (Claude) — modelo de calidad para síntesis, rápido para tareas cortas.
- **Imágenes**: Higgsfield MCP (artes) con control de costo.
- **WhatsApp**: conector WhatsApp Web (whatsapp-web.js) anti-baneo + endpoints `incoming/outbox/sync` con secreto compartido.
- **Auth**: cookie firmada (HMAC) + multiusuario por rol; middleware protege todo menos login/conector.
- **Seguridad**: secretos solo en variables de entorno (nunca en el repo); rate limiting; anti-baneo WhatsApp.

### Modelo de datos (KV)
```
users:index                  → [{id, nombre, area, rol, waNumber}]
user:<id>                    → credenciales/hash, look (avatar), número corporativo
office:state                 → estado en vivo por persona ({id, estado, texto, at})
office:ambient               → ambiente actual (día/noche, modo, evento activo)
issues:index / issue:<id>    → novedades + hilo de mensajes
tasks:mkt / tasks:pauta      → tableros de Marketing y Pauta
agents:promos|artes|calendario|coordinador → última salida de cada agente
wa:chats / wa:chat:<num>     → bandeja y conversaciones de WhatsApp (mapeadas a usuarios)
wa:kb                        → base de conocimiento + tono (modo agente opcional)
events:sports                → eventos de calendario.ganaplay.lat (cache, con relevancia+descripción)
```

### Endpoints API (borrador)
```
POST /api/auth/login                 login por usuario
GET  /api/me                         identidad + rol
GET/POST /api/office/state           estado en vivo (lo propio); GET = toda la oficina (Director)
GET  /api/office/ambient             ambiente actual (hora, modo, evento)
GET/POST /api/issues  · GET /api/issues/:id    novedades + hilo
GET/POST /api/tasks                  tableros marketing/pauta
POST /api/agents/run · GET /api/agents/output  agentes de producto
GET  /api/calendar                   eventos desde calendario.ganaplay.lat (cache KV)
GET  /api/wa/chats · POST /api/wa/send · POST /api/wa/incoming · /outbox · /sync   WhatsApp
GET/POST /api/wa/kb                  base de conocimiento (modo agente)
GET  /api/summary                    KPIs + resumen del día (Director)
```

---

## 10. Pantallas

1. **Login** (por usuario).
2. **Oficina** (principal): áreas (Marketing, Pauta, SAC, Contabilidad, Producto), ambiente dinámico, personajes vivos, alertas, clic → chat de novedad.
3. **Panel del usuario**: mi estado, crear novedad, mis hilos.
4. **Bandeja del Director**: novedades (filtros área/prioridad) + resolver.
5. **WhatsApp del equipo**: bandeja por miembro, chat, modo agente opcional, KB.
6. **Producto / Agentes**: salida de los 4 agentes, lanzar tareas, ver artes/promos/calendario.
7. **Marketing & Pauta**: tableros de tareas + artes + campañas.
8. **Resumen/KPIs**.
9. **Editor de personajes** (apariencia del avatar de cada usuario).

---

## 11. Fases de construcción (orden sugerido)

1. **Base + Auth multiusuario** (Director + áreas, incl. Pauta) y modelo KV.
2. **Oficina pixel** con áreas y **ambiente dinámico** (día/noche, modos) — sin IA aún.
3. **Sistema de novedades/alertas + chat bidireccional** (el corazón) con cierre controlado.
4. **WhatsApp del equipo** (conector anti-baneo, bandeja, solo-Director, modo agente opcional + KB).
5. **Tableros de tareas** Marketing y Pauta + panel de cada usuario.
6. **Los 4 agentes de Producto** (promociones, artes+subagentes, calendario, coordinador).
7. **Integración `calendario.ganaplay.lat`** (eventos + relevancia + descripción + "modo evento").
8. **KPIs + resumen del día**.
9. **Pulido PRO**: estética GANAPLAY, ambiente con máximo detalle, sonidos, robustez (sin 404/crashes), anti-datos-falsos, anti-baneo.

---

## 12. Definición de "terminado" (calidad PRO)

- Cada persona entra con su login y solo ve/edita lo suyo; el Director lo ve todo.
- Áreas completas: Marketing (Fernanda + Juan/Verónica/Eliana), **Pauta**, SAC (Álvaro +3), Contabilidad (4), Producto (4 agentes).
- Una novedad de SAC dispara alarma en el tablero del Director **al instante** (≤5s); no se cierra hasta resolverse; queda en historial.
- El Director **chatea por WhatsApp** con cualquier miembro (número corporativo), igual que WhatsApp Web; **solo él** escribe; modo agente opcional funciona y está OFF por defecto; **sin riesgo de baneo** (1-a-1, anti-spam).
- La oficina **cambia de ambiente** (día/noche, modos, evento deportivo) con detalle.
- `calendario.ganaplay.lat` se muestra con **descripción y relevancia** por evento y dispara recordatorios.
- Los 4 agentes producen salida **real**; si no pueden, lo dicen (no inventan).
- Todo persiste en servidor: cerrar y reabrir no pierde nada; igual en otro dispositivo.
- Sin pantallas en blanco, sin 404 crudos, sin datos simulados.
