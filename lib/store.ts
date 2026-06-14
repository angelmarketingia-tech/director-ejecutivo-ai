"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Agent,
  AgentId,
  ActivityEvent,
  AreaAgent,
  Area,
  CallRecord,
  EmailRecord,
  Lead,
  Metrics,
  PipelineStage,
  Presence,
  StaffMember,
  Subagent,
  WhatsAppMessage,
} from "@/lib/types";
import {
  AGENTS_SEED,
  generateLead,
  seedLeads,
  STAGE_ORDER,
  STAGE_LABEL,
} from "@/lib/demo/data";
import {
  AREA_AGENTS_SEED,
  AGENT_TASKS,
  STAFF_SEED,
  SUBAGENT_PLAYBOOK,
} from "@/lib/departments";
import { type Preset, type ChannelsMode } from "@/lib/agents/pricing";
import { IS_DEMO } from "@/lib/demoFlag";

/** Forma de un lead descubierto por búsqueda web (definido aquí para no importar
 *  el módulo servidor `webprospect` en el cliente). */
export interface DiscoveredLeadInput {
  company: string;
  category: string | null;
  city: string | null;
  website: string | null;
  hasWebsite: boolean;
  socials: string[];
  evidenceUrl: string | null;
  audienceNote: string | null;
  /** Contacto real (lo da Apify; la búsqueda web puede no traerlo). */
  phone?: string | null;
  email?: string | null;
}

type View =
  | "deck"
  | "pipeline"
  | "leads"
  | "calls"
  | "whatsapp"
  | "emails"
  | "settings";

interface DeckState {
  area: Area;
  setArea: (a: Area) => void;

  view: View;
  setView: (v: View) => void;

  /** Drawer de navegación en móvil (transitorio, no se persiste). */
  mobileNavOpen: boolean;
  setMobileNav: (open: boolean) => void;

  /** Agentes autónomos por área (con árbol de subagentes). */
  areaAgents: Record<Exclude<Area, "hq">, AreaAgent[]>;
  /** Personal REAL supervisado por RR.HH. */
  staff: StaffMember[];
  /** Una persona marca su actividad actual. */
  checkIn: (id: string, data: { presence: Presence; activity: string }) => void;

  // ── Control de agentes (cuidar el uso de API) ──
  /** Encendido/apagado por agente (clave: id de agente comercial o de área). */
  agentEnabled: Record<string, boolean>;
  toggleAgent: (id: string) => void;
  setAllAgents: (on: boolean) => void;
  /** Si los agentes pueden generar subagentes (más calidad, más tokens). */
  subagentsEnabled: boolean;
  toggleSubagents: () => void;

  running: boolean;
  speed: number; // multiplicador
  toggleRunning: () => void;
  setSpeed: (s: number) => void;

  // ── Configuración real de costos / canales ──
  preset: Preset; // mezcla de modelos (económica/equilibrada/premium)
  setPreset: (p: Preset) => void;
  channelsMode: ChannelsMode; // "full" o "no_voice" (sin llamadas)
  setChannelsMode: (c: ChannelsMode) => void;
  dailyCaps: { emails: number; whatsapp: number; calls: number; spendUsd: number };
  setCap: (k: keyof DeckState["dailyCaps"], v: number) => void;
  /** Consumo real del día (registros creados + gasto estimado de API). Se corta al llegar al tope. */
  usedToday: { emails: number; whatsapp: number; calls: number; spendUsd: number };

  agents: Agent[];
  leads: Lead[];
  events: ActivityEvent[];
  calls: CallRecord[];
  whatsapp: WhatsAppMessage[];
  emails: EmailRecord[];
  metrics: Metrics;
  selectedLeadId: string | null;
  selectLead: (id: string | null) => void;

  /** Avanza la simulación ambiental un paso (vida de fondo). */
  tick: () => void;
  reset: () => void;

  // ── Motor REAL (acciones deterministas y trazables, no aleatorias) ──
  /** Genera un lead real y lo coloca en "prospectado". Devuelve su id. */
  addLead: () => string;
  /** Inserta leads REALES descubiertos (dedup por empresa+ciudad). Devuelve cuántos nuevos. */
  addDiscoveredLeads: (items: DiscoveredLeadInput[]) => number;
  /** Carga los leads guardados en el servidor (cross-device) al entrar. */
  loadServerLeads: () => Promise<void>;
  /**
   * Prepara un lead para el contacto, SIN inventar nada que no haya pasado:
   * 1) Investiga (deriva necesidades de los datos reales del negocio),
   * 2) Califica (score/temperatura a partir de señales reales),
   * 3) Redacta un BORRADOR de mensaje listo para que TÚ lo envíes.
   * Se detiene en "Calificado". No envía emails, no hace llamadas, no cierra
   * tratos solo. Devuelve la etapa final (normalmente "qualified").
   */
  runLeadPipeline: (id: string, opts?: { sync?: boolean }) => PipelineStage;
  /** Investiga + califica + prepara mensaje en todos los leads abiertos. */
  closeAllOpen: () => { processed: number; qualified: number };
  /** Registras TÚ que ya enviaste el contacto (lo marcas como hecho de verdad). */
  markContacted: (id: string) => void;
  /** Mueves manualmente un lead a una etapa real (interesado/reunión/ganado/perdido). */
  advanceLead: (id: string, stage: PipelineStage) => void;
  /** Marca un lead para revisión/cierre humano. */
  escalateLead: (id: string) => void;
}

const TASKS: Record<AgentId, string[]> = {
  director: [
    "Balanceando carga entre estaciones",
    "Re-priorizando leads calientes",
    "Aprobando campaña de email sensible",
    "Escalando oportunidad a humano",
    "Revisando KPIs del día",
  ],
  prospect: [
    "Rastreando negocios sin sitio web",
    "Indexando Google Business de la zona",
    "Filtrando pymes por categoría",
    "Detectando oportunidades en el nicho",
  ],
  research: [
    "Analizando reseñas y reputación",
    "Comparando contra competencia local",
    "Evaluando presencia digital",
    "Mapeando necesidad potencial",
  ],
  scoring: [
    "Limpiando y deduplicando datos",
    "Calculando score comercial",
    "Clasificando frío / tibio / caliente",
    "Asignando siguiente acción",
  ],
  email: [
    "Redactando propuesta de valor",
    "Personalizando plantilla por rubro",
    "Inyectando variables dinámicas",
    "Programando secuencia de seguimiento",
  ],
  voice: [
    "Marcando vía ElevenLabs + Twilio",
    "Manejando objeción de precio",
    "Calificando intención de compra",
    "Agendando reunión de cierre",
  ],
};

const OBJECTIONS = [
  "Precio elevado",
  "Ya tengo proveedor",
  "No es buen momento",
  "Necesito consultarlo",
  "No veo el valor aún",
];

const emptyMetrics = (): Metrics => ({
  leadsFound: 0,
  leadsQualified: 0,
  emailsSent: 0,
  whatsappSent: 0,
  callsMade: 0,
  meetingsBooked: 0,
  dealsWon: 0,
  hotLeads: 0,
  revenue: 0,
  conversionRate: 0,
});

let EVT = 1;
const evt = (
  agent: AgentId,
  level: ActivityEvent["level"],
  message: string
): ActivityEvent => ({
  id: `ev_${EVT++}`,
  agent,
  level,
  message,
  at: Date.now(),
});

const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/**
 * Construye un mensaje de contacto REAL (texto listo para enviar) a partir de los
 * datos del lead. No es una conversación simulada: es un borrador que TÚ envías.
 */
function buildOutreach(lead: Lead): NonNullable<Lead["outreach"]> {
  const first = lead.contactName?.split(" ")[0];
  const hi = first ? `Hola ${first}` : "Hola";
  const ref =
    lead.rating && lead.reviews
      ? `vi ${lead.company} en Google (${lead.rating}★, ${lead.reviews} reseñas)`
      : `vi ${lead.company}`;
  let message: string;
  if (!lead.hasWebsite) {
    message =
      `${hi} 👋, ${ref} y noté que aún no tienen página web propia. ` +
      `Hoy casi todos los clientes buscan por internet antes de decidir, y sin web esas visitas se pierden. ` +
      `Hago sitios sencillos (menú/catálogo, fotos, ubicación y botón directo a WhatsApp) para negocios de ${lead.city}. ` +
      `¿Le comparto un ejemplo de cómo se vería el de ${lead.company}?`;
  } else {
    message =
      `${hi} 👋, ${ref}. Revisé su sitio web y tengo 2 mejoras concretas para que aparezca mejor en Google ` +
      `y convierta más visitas en clientes (velocidad en celular, contacto/reservas y posicionamiento local). ` +
      `¿Le interesa que se las muestre sin compromiso?`;
  }
  const channel: "whatsapp" | "email" = lead.phone ? "whatsapp" : "email";
  const subject = `${lead.company}: más clientes con una web profesional`;
  return { channel, subject, message, preparedAt: Date.now() };
}

/** Clave estable de un lead para sincronizar entre dispositivos (igual que en el servidor). */
const leadKey = (l: { company: string; city?: string }) =>
  `${l.company.toLowerCase().trim()}|${(l.city || "").toLowerCase().trim()}`;

/**
 * Sube el AVANCE de los leads (etapa, mensaje preparado, contactado/ganado/perdido) al
 * servidor (KV) para que se vea en todos los dispositivos. Solo en operación real.
 * Es fire-and-forget: si falla (sin red/sesión), queda el respaldo local del navegador.
 */
function syncStatesToServer(leads: Lead[]) {
  if (IS_DEMO || typeof window === "undefined" || !leads.length) return;
  const states = leads.map((l) => ({
    key: leadKey(l),
    stage: l.stage,
    score: l.score,
    temperature: l.temperature,
    consent: l.consent,
    needs: l.needs,
    outreach: l.outreach,
    updatedAt: Date.now(),
  }));
  fetch("/api/leads/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ states }),
  }).catch(() => {
    /* offline / sin sesión: el avance queda guardado localmente */
  });
}

const stageNext = (s: PipelineStage): PipelineStage => {
  const i = STAGE_ORDER.indexOf(s);
  return i < 0 || i >= STAGE_ORDER.length - 1 ? s : STAGE_ORDER[i + 1];
};

function recomputeMetrics(s: {
  leads: Lead[];
  emails: EmailRecord[];
  whatsapp: WhatsAppMessage[];
  calls: CallRecord[];
}): Metrics {
  const won = s.leads.filter((l) => l.stage === "won").length;
  const contactedPlus = s.leads.filter((l) =>
    ["contacted", "engaged", "meeting", "won"].includes(l.stage)
  ).length;
  const revenue = s.leads.reduce(
    (acc, l) =>
      acc + (l.closeProbability / 100) * (l.temperature === "hot" ? 4800 : 2400),
    0
  );
  return {
    leadsFound: s.leads.length,
    leadsQualified: s.leads.filter((l) =>
      ["qualified", "contacted", "engaged", "meeting", "won"].includes(l.stage)
    ).length,
    emailsSent: s.emails.length,
    whatsappSent: s.whatsapp.filter((w) => w.direction === "out").length,
    callsMade: s.calls.length,
    meetingsBooked: s.leads.filter((l) =>
      ["meeting", "won"].includes(l.stage)
    ).length,
    dealsWon: won,
    hotLeads: s.leads.filter((l) => l.temperature === "hot").length,
    revenue: Math.round(revenue),
    conversionRate: contactedPlus ? Math.round((won / contactedPlus) * 100) : 0,
  };
}

// Modo real: sin leads falsos. Demo: lote inicial para demostración.
const initialLeads = IS_DEMO ? seedLeads(14) : [];

// ── Agentes de área (autónomos, con subagentes) ──
let SUB = 1;
let WEBSEQ = 1; // ids de leads descubiertos por web
function buildAreaAgents(): Record<Exclude<Area, "hq">, AreaAgent[]> {
  const out = {} as Record<Exclude<Area, "hq">, AreaAgent[]>;
  (Object.keys(AREA_AGENTS_SEED) as Array<Exclude<Area, "hq">>).forEach((area) => {
    out[area] = AREA_AGENTS_SEED[area].map((a) => {
      const tasks = AGENT_TASKS[a.name] ?? [{ task: "En espera de asignación", goal: "—" }];
      const t = tasks[0];
      if (!IS_DEMO) {
        // Operación real: agente en reposo hasta que se le asigne una tarea real.
        return {
          ...a,
          mode: "idle",
          task: null,
          goal: null,
          taskProgress: 0,
          subagents: [],
          completedTasks: 0,
          qualityScore: 0,
        } as AreaAgent;
      }
      return {
        ...a,
        mode: "working",
        task: t.task,
        goal: t.goal,
        taskProgress: Math.floor(Math.random() * 40),
        subagents: [],
        completedTasks: Math.floor(Math.random() * 8),
        qualityScore: 88 + Math.floor(Math.random() * 10),
      } as AreaAgent;
    });
  });
  return out;
}

function spawnSubagent(agentName: string): Subagent {
  const pool = SUBAGENT_PLAYBOOK[agentName] ?? SUBAGENT_PLAYBOOK.default;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: `sub_${SUB++}`,
    label: pick.label,
    purpose: pick.purpose,
    progress: 0,
    status: "spawning",
  };
}

/** Avanza un agente de área un paso: progreso, modos y árbol de subagentes (calidad > velocidad). */
function advanceAreaAgent(a: AreaAgent, subagentsEnabled = true): AreaAgent {
  const agent = { ...a, subagents: a.subagents.map((s) => ({ ...s })) };

  // Avanzar subagentes vivos
  agent.subagents.forEach((s) => {
    if (s.status === "spawning") s.status = "working";
    else if (s.status === "working") {
      s.progress += 22 + Math.random() * 28;
      if (s.progress >= 100) {
        s.progress = 100;
        s.status = "done";
      }
    }
  });

  const working = agent.subagents.filter((s) => s.status !== "done");
  const justFinished = agent.subagents.some((s) => s.status === "done");

  // Decidir modo
  if (working.length > 0) {
    agent.mode = working.some((s) => s.status === "spawning") ? "spawning" : "reviewing";
  } else if (justFinished) {
    agent.mode = "synthesizing";
  } else {
    agent.mode = "working";
  }

  // Progreso de la tarea principal: más lento cuando hay subagentes (calidad, no velocidad)
  const step = working.length > 0 ? 4 + Math.random() * 6 : 10 + Math.random() * 16;
  agent.taskProgress = Math.min(100, agent.taskProgress + step);

  // En tareas avanzadas, a veces genera subagentes para subir el listón de calidad
  if (
    subagentsEnabled &&
    agent.taskProgress > 45 &&
    agent.taskProgress < 92 &&
    working.length === 0 &&
    !justFinished &&
    Math.random() < 0.4
  ) {
    const n = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) agent.subagents.push(spawnSubagent(agent.name));
    agent.mode = "spawning";
  }

  // Completar tarea y tomar la siguiente
  if (agent.taskProgress >= 100 && working.length === 0) {
    agent.completedTasks += 1;
    agent.qualityScore = Math.min(99, Math.max(80, agent.qualityScore + (Math.random() * 4 - 1)));
    const tasks = AGENT_TASKS[agent.name] ?? [{ task: "En espera", goal: "—" }];
    const next = tasks[Math.floor(Math.random() * tasks.length)];
    agent.task = next.task;
    agent.goal = next.goal;
    agent.taskProgress = 0;
    agent.subagents = [];
    agent.mode = "planning";
  } else if (agent.subagents.length) {
    // Retirar subagentes terminados una vez sintetizados
    if (agent.subagents.every((s) => s.status === "done") && Math.random() < 0.5) {
      agent.subagents = [];
    }
  }

  return agent;
}

function buildAgentEnabled(): Record<string, boolean> {
  const ids: string[] = AGENTS_SEED.map((a) => a.id);
  (Object.values(AREA_AGENTS_SEED) as Array<Array<{ id: string }>>).forEach((arr) =>
    arr.forEach((a) => ids.push(a.id))
  );
  return Object.fromEntries(ids.map((id) => [id, true]));
}

function seedStaff(): StaffMember[] {
  if (!IS_DEMO) return []; // operación real: sin personal ficticio
  return STAFF_SEED.map((s, i) => ({
    ...s,
    activitySince: Date.now() - (3 + i * 7) * 60 * 1000 - Math.floor(Math.random() * 5 * 60 * 1000),
  }));
}

export const useDeck = create<DeckState>()(
  persist(
    (set, get) => ({
  area: "hq",
  setArea: (area) => set({ area }),

  mobileNavOpen: false,
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),

  areaAgents: buildAreaAgents(),
  staff: seedStaff(),
  checkIn: (id, data) =>
    set((s) => ({
      staff: s.staff.map((p) =>
        p.id === id
          ? {
              ...p,
              presence: data.presence,
              activity: data.activity,
              activitySince: Date.now(),
              checkinsToday: p.checkinsToday + 1,
            }
          : p
      ),
    })),

  view: "deck",
  setView: (v) => set({ view: v }),

  running: IS_DEMO, // en operación real no hay simulación automática
  speed: 1,
  toggleRunning: () => set((s) => ({ running: !s.running })),
  setSpeed: (speed) => set({ speed }),

  preset: "equilibrada",
  setPreset: (preset) => set({ preset }),
  channelsMode: "full",
  setChannelsMode: (channelsMode) => set({ channelsMode }),
  dailyCaps: { emails: 200, whatsapp: 120, calls: 60, spendUsd: 15 },
  setCap: (k, v) => set((s) => ({ dailyCaps: { ...s.dailyCaps, [k]: v } })),
  usedToday: { emails: 0, whatsapp: 0, calls: 0, spendUsd: 0 },

  agentEnabled: buildAgentEnabled(),
  toggleAgent: (id) =>
    set((s) => ({ agentEnabled: { ...s.agentEnabled, [id]: !s.agentEnabled[id] } })),
  setAllAgents: (on) =>
    set((s) => ({
      agentEnabled: Object.fromEntries(Object.keys(s.agentEnabled).map((k) => [k, on])),
    })),
  subagentsEnabled: true,
  toggleSubagents: () => set((s) => ({ subagentsEnabled: !s.subagentsEnabled })),

  agents: AGENTS_SEED.map((a) =>
    IS_DEMO
      ? { ...a }
      : { ...a, status: "idle", currentTask: null, progress: 0, throughput: 0, queue: 0 }
  ),
  leads: initialLeads,
  events: IS_DEMO
    ? [
        evt("director", "info", "Sala de control inicializada · modo DEMO"),
        evt("prospect", "info", "Estación SCOUT en línea"),
      ]
    : [evt("director", "info", "Operación real iniciada · sin datos cargados")],
  calls: [],
  whatsapp: [],
  emails: [],
  metrics: recomputeMetrics({
    leads: initialLeads,
    emails: [],
    whatsapp: [],
    calls: [],
  }),
  selectedLeadId: null,
  selectLead: (id) => set({ selectedLeadId: id }),

  tick: () => {
    const s = get();
    if (!IS_DEMO) return; // operación real: no se fabrican datos
    if (!s.running) return;

    let leads = [...s.leads];
    let events = [...s.events];
    let calls = [...s.calls];
    let whatsapp = [...s.whatsapp];
    let emails = [...s.emails];
    const agents = s.agents.map((a) => ({ ...a }));

    const push = (e: ActivityEvent) => {
      events = [e, ...events].slice(0, 80);
    };

    // 1) Cada agente "respira": avanza progreso y rota tarea. Los apagados quedan en reposo.
    for (const a of agents) {
      if (s.agentEnabled[a.id] === false) {
        a.status = "idle";
        a.currentTask = "Desactivado";
        a.progress = 0;
        continue;
      }
      if (a.id === "director") {
        a.currentTask = rnd(TASKS.director);
        continue;
      }
      a.progress += 18 + Math.random() * 26;
      if (a.progress >= 100) {
        a.progress = Math.random() * 30;
        a.throughput += 1;
        a.queue = Math.max(0, a.queue - 1 + (Math.random() > 0.6 ? 1 : 0));
      }
      a.currentTask = rnd(TASKS[a.id]);
    }

    // 2) Prospección: a veces aparece un lead nuevo.
    if (Math.random() < 0.5) {
      const lead = generateLead();
      leads = [lead, ...leads].slice(0, 200);
      push(
        evt(
          "prospect",
          lead.website ? "info" : "success",
          `Nuevo lead: ${lead.company} (${lead.city})${
            lead.website ? "" : " · SIN sitio web"
          }`
        )
      );
    }

    // 3) Mover un lead aleatorio por el pipeline con la estación adecuada.
    const movable = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
    if (movable.length) {
      const lead = rnd(movable);
      const from = lead.stage;
      const to = stageNext(from);
      lead.stage = to;

      switch (to) {
        case "researched":
          lead.ownerAgent = "research";
          push(evt("research", "info", `Investigado: ${lead.company} · rating ${lead.rating}★`));
          break;
        case "qualified": {
          lead.ownerAgent = "scoring";
          lead.nextAction = lead.temperature === "hot" ? "Llamar hoy" : "Email + seguimiento";
          push(
            evt(
              "scoring",
              lead.temperature === "hot" ? "alert" : "info",
              `Score ${lead.score} · ${lead.temperature.toUpperCase()} — ${lead.company}`
            )
          );
          break;
        }
        case "contacted": {
          // Canal según temperatura
          if (lead.temperature === "hot" && Math.random() > 0.4) {
            lead.ownerAgent = "voice";
            const call: CallRecord = {
              id: `cl_${calls.length + 1}`,
              leadId: lead.id,
              company: lead.company,
              durationSec: 60 + Math.floor(Math.random() * 360),
              outcome: rnd([
                "connected",
                "meeting_booked",
                "callback",
                "voicemail",
                "no_answer",
              ]) as CallRecord["outcome"],
              interest: rnd(["low", "medium", "high"]) as CallRecord["interest"],
              objections: Math.random() > 0.5 ? [rnd(OBJECTIONS)] : [],
              nextStep: "Enviar propuesta",
              followUpAt: Date.now() + 1000 * 60 * 60 * 24,
              closeProbability: lead.closeProbability,
              transcriptSnippet:
                "«Cuénteme cómo me ayudarían a conseguir más clientes...»",
              at: Date.now(),
            };
            calls = [call, ...calls].slice(0, 120);
            lead.consent = "soft_optin";
            push(evt("voice", "alert", `Llamada a ${lead.company} · ${call.outcome}`));
            if (call.outcome === "meeting_booked") lead.stage = "meeting";
          } else {
            lead.ownerAgent = "email";
            const email: EmailRecord = {
              id: `em_${emails.length + 1}`,
              leadId: lead.id,
              company: lead.company,
              subject: `${lead.company}: más clientes con ${lead.needs[0]?.toLowerCase()}`,
              template: lead.hasWebsite ? "mejora_presencia" : "sin_web",
              status: "sent",
              at: Date.now(),
            };
            emails = [email, ...emails].slice(0, 120);
            push(evt("email", "success", `Email enviado → ${lead.company}`));
            // y un WhatsApp de seguimiento ligero
            if (Math.random() > 0.5) {
              const wa: WhatsAppMessage = {
                id: `wa_${whatsapp.length + 1}`,
                leadId: lead.id,
                company: lead.company,
                direction: "out",
                body: `Hola ${lead.contactName?.split(" ")[0]}, te escribimos de Director Comercial AI 👋`,
                status: "delivered",
                templateName: "intro_optin",
                at: Date.now(),
              };
              whatsapp = [wa, ...whatsapp].slice(0, 120);
              push(evt("voice", "info", `WhatsApp → ${lead.company}`));
            }
          }
          break;
        }
        case "engaged":
          lead.consent = "opt_in";
          push(evt("director", "alert", `🔥 ${lead.company} muestra interés alto`));
          break;
        case "meeting":
          push(evt("voice", "success", `Reunión agendada con ${lead.company}`));
          break;
        case "won":
          push(evt("director", "success", `✅ CIERRE: ${lead.company}`));
          break;
      }
    }

    const metrics = recomputeMetrics({ leads, emails, whatsapp, calls });

    // Avanzar agentes autónomos de todas las áreas (tarea end-to-end + subagentes).
    // Los agentes APAGADOS quedan en reposo (no consumen API).
    const areaAgents = { ...s.areaAgents };
    (Object.keys(areaAgents) as Array<Exclude<Area, "hq">>).forEach((area) => {
      areaAgents[area] = areaAgents[area].map((ag) =>
        s.agentEnabled[ag.id] === false
          ? { ...ag, mode: "idle", taskProgress: 0, subagents: [] }
          : advanceAreaAgent(ag, s.subagentsEnabled)
      );
    });

    set({ leads, events, calls, whatsapp, emails, agents, metrics, areaAgents });
  },

  addLead: () => {
    const lead = generateLead();
    lead.stage = "prospected";
    set((s) => {
      const leads = [lead, ...s.leads].slice(0, 300);
      return {
        leads,
        events: [
          evt("prospect", lead.website ? "info" : "success", `SCOUT detectó ${lead.company} (${lead.city})${lead.website ? "" : " · SIN web"}`),
          ...s.events,
        ].slice(0, 80),
        metrics: recomputeMetrics({ leads, emails: s.emails, whatsapp: s.whatsapp, calls: s.calls }),
      };
    });
    return lead.id;
  },

  loadServerLeads: async () => {
    try {
      const r = await fetch("/api/leads");
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j.leads) && j.leads.length) get().addDiscoveredLeads(j.leads);
      }
      // Aplica el AVANCE guardado en el servidor (etapa, mensaje, contactado/ganado…),
      // para que el progreso se vea igual en celular y PC.
      const sr = await fetch("/api/leads/state");
      if (sr.ok) {
        const sj = await sr.json();
        const states: Record<string, any> = sj?.states ?? {};
        if (Object.keys(states).length) {
          set((s) => {
            const leads = s.leads.map((l) => {
              const st = states[leadKey(l)];
              if (!st) return l;
              return {
                ...l,
                stage: (st.stage as Lead["stage"]) ?? l.stage,
                score: typeof st.score === "number" ? st.score : l.score,
                temperature: (st.temperature as Lead["temperature"]) ?? l.temperature,
                consent: (st.consent as Lead["consent"]) ?? l.consent,
                needs: Array.isArray(st.needs) ? st.needs : l.needs,
                outreach: (st.outreach as Lead["outreach"]) ?? l.outreach,
              };
            });
            return {
              leads,
              metrics: recomputeMetrics({ leads, emails: s.emails, whatsapp: s.whatsapp, calls: s.calls }),
            };
          });
        }
      }
    } catch {
      /* sin red / sin sesión: no pasa nada */
    }
  },

  addDiscoveredLeads: (items) => {
    if (!items?.length) return 0;
    let n = 0;
    set((s) => {
      // Dedupe por empresa+ciudad (evita duplicados al cargar del servidor + buscar)
      const seen = new Set(
        s.leads.map((l) => `${l.company.toLowerCase().trim()}|${(l.city || "").toLowerCase().trim()}`)
      );
      items = items.filter((it) => {
        const k = `${(it.company || "").toLowerCase().trim()}|${(it.city || "").toLowerCase().trim()}`;
        if (!it.company || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (items.length === 0) return {};
      const mapped: Lead[] = items.map((it) => {
        const hasWebsite = it.hasWebsite;
        const digitalScore = hasWebsite ? 55 : 18;
        // Sin rating real disponible: el score pondera la oportunidad (sin web = más alta).
        const score = Math.max(20, Math.min(95, (hasWebsite ? 55 : 78) + (it.socials.length ? 6 : 0)));
        const temperature: Lead["temperature"] = score >= 72 ? "hot" : score >= 48 ? "warm" : "cold";
        const needs = hasWebsite
          ? ["Mejora de presencia digital", "Marketing digital"]
          : ["Sitio web profesional", "Presencia digital"];
        n++;
        return {
          id: `ld_web_${WEBSEQ++}`,
          company: it.company,
          category: it.category ?? "Negocio",
          city: it.city ?? "",
          country: "",
          // Contacto: solo si la fuente lo trae (Apify); nunca inventado.
          contactName: undefined,
          phone: it.phone ?? undefined,
          email: it.email ?? undefined,
          website: it.website,
          hasWebsite,
          digitalScore,
          rating: undefined,
          reviews: undefined,
          score,
          temperature,
          stage: "prospected",
          closeProbability: Math.round(score * 0.6),
          needs,
          consent: "none",
          createdAt: Date.now(),
          ownerAgent: "prospect",
          sourceUrl: it.evidenceUrl ?? undefined,
          socials: it.socials,
          verified: true,
        } as Lead;
      });
      const leads = [...mapped, ...s.leads].slice(0, 300);
      return {
        leads,
        events: [
          evt("prospect", "success", `SCOUT (web real): ${mapped.length} negocios verificados añadidos`),
          ...s.events,
        ].slice(0, 80),
        metrics: recomputeMetrics({ leads, emails: s.emails, whatsapp: s.whatsapp, calls: s.calls }),
      };
    });
    return n;
  },

  runLeadPipeline: (id, opts) => {
    const s = get();
    const idx = s.leads.findIndex((l) => l.id === id);
    if (idx < 0) return "lost";

    let lead = { ...s.leads[idx] };
    // No re-procesar resultados que TÚ ya marcaste (ganado/perdido).
    if (lead.stage === "won" || lead.stage === "lost") return lead.stage;

    const en = s.agentEnabled; // agentes encendidos
    let events = [...s.events];
    const push = (agent: AgentId, level: ActivityEvent["level"], message: string) => {
      events = [evt(agent, level, message), ...events].slice(0, 80);
    };

    // 1) Investigación (ORACLE) — deriva necesidades de DATOS REALES, sin inventar.
    lead.stage = "researched";
    lead.ownerAgent = "research";
    if (!lead.hasWebsite && !lead.needs.includes("Sitio web profesional")) {
      lead.needs = ["Sitio web profesional", ...lead.needs];
    }
    if (en.research !== false) {
      push(
        "research",
        "info",
        `ORACLE investigó ${lead.company} · ${lead.hasWebsite ? "tiene web" : "sin web"}${lead.rating ? ` · ${lead.rating}★` : ""}`
      );
    }

    // 2) Calificación (FORGE) — score/temperatura a partir de señales reales del lead.
    lead.stage = "qualified";
    lead.ownerAgent = "scoring";
    lead.nextAction = "Enviar mensaje preparado";
    if (en.scoring !== false) {
      push(
        "scoring",
        lead.temperature === "hot" ? "alert" : "info",
        `FORGE calificó ${lead.company}: score ${lead.score} · ${lead.temperature.toUpperCase()}`
      );
    }

    // 3) Preparación del contacto (QUILL) — BORRADOR real, listo para que TÚ lo envíes.
    //    NO se envía nada, NO se simula respuesta del cliente, NO se cierra el trato.
    lead.outreach = buildOutreach(lead);
    if (en.email !== false) {
      push("email", "success", `QUILL preparó el mensaje para ${lead.company} · listo para enviar (no enviado)`);
    }

    const leads = [...s.leads];
    leads[idx] = lead;
    set({ leads, events });
    // Sincroniza el avance entre dispositivos (salvo que el lote lo haga en bloque).
    if (opts?.sync !== false) syncStatesToServer([lead]);
    return lead.stage;
  },

  closeAllOpen: () => {
    const open = get().leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
    let qualified = 0;
    const ids = open.map((l) => l.id);
    for (const l of open) {
      const end = get().runLeadPipeline(l.id, { sync: false });
      if (end === "qualified") qualified++;
    }
    // Una sola subida con todo el lote (evita una petición por lead).
    const changed = get().leads.filter((l) => ids.includes(l.id));
    syncStatesToServer(changed);
    return { processed: open.length, qualified };
  },

  markContacted: (id) => {
    set((s) => {
      const idx = s.leads.findIndex((l) => l.id === id);
      if (idx < 0) return {} as Partial<DeckState>;
      const lead = { ...s.leads[idx] };
      lead.stage = "contacted";
      lead.consent = "soft_optin";
      if (lead.outreach) lead.outreach = { ...lead.outreach, sentAt: Date.now() };
      const leads = [...s.leads];
      leads[idx] = lead;

      // Registro REAL del envío que TÚ hiciste (no fabricado por el sistema).
      const used = { ...s.usedToday };
      let emails = s.emails;
      let whatsapp = s.whatsapp;
      if (lead.outreach?.channel === "email") {
        const email: EmailRecord = {
          id: `em_${s.emails.length + 1}_${lead.id}`,
          leadId: lead.id,
          company: lead.company,
          subject: lead.outreach.subject ?? lead.company,
          template: "manual",
          status: "sent",
          at: Date.now(),
        };
        emails = [email, ...s.emails].slice(0, 200);
        used.emails += 1;
      } else {
        const wa: WhatsAppMessage = {
          id: `wa_${s.whatsapp.length + 1}_${lead.id}`,
          leadId: lead.id,
          company: lead.company,
          direction: "out",
          body: lead.outreach?.message ?? "",
          status: "sent",
          templateName: "manual",
          at: Date.now(),
        };
        whatsapp = [wa, ...s.whatsapp].slice(0, 200);
        used.whatsapp += 1;
      }

      return {
        leads,
        emails,
        whatsapp,
        usedToday: used,
        events: [evt("director", "success", `Contacto registrado por ti: ${lead.company}`), ...s.events].slice(0, 80),
        metrics: recomputeMetrics({ leads, emails, whatsapp, calls: s.calls }),
      };
    });
    const updated = get().leads.find((l) => l.id === id);
    if (updated) syncStatesToServer([updated]);
  },

  advanceLead: (id, stage) => {
    set((s) => {
      const idx = s.leads.findIndex((l) => l.id === id);
      if (idx < 0) return {} as Partial<DeckState>;
      const lead = { ...s.leads[idx], stage };
      const leads = [...s.leads];
      leads[idx] = lead;
      const level: ActivityEvent["level"] =
        stage === "won" ? "success" : stage === "lost" ? "warn" : "info";
      return {
        leads,
        events: [
          evt("director", level, `${lead.company} → ${STAGE_LABEL[stage]} (marcado por ti)`),
          ...s.events,
        ].slice(0, 80),
        metrics: recomputeMetrics({ leads, emails: s.emails, whatsapp: s.whatsapp, calls: s.calls }),
      };
    });
    const updated = get().leads.find((l) => l.id === id);
    if (updated) syncStatesToServer([updated]);
  },

  escalateLead: (id) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === id);
      return {
        events: [
          evt("director", "alert", `Escalado a humano: ${lead?.company ?? id} requiere atención`),
          ...s.events,
        ].slice(0, 80),
      };
    }),

  reset: () => {
    const leads = IS_DEMO ? seedLeads(14) : [];
    set({
      leads,
      calls: [],
      whatsapp: [],
      emails: [],
      events: [evt("director", "info", IS_DEMO ? "Simulación reiniciada" : "Datos reiniciados")],
      agents: AGENTS_SEED.map((a) =>
        IS_DEMO ? { ...a } : { ...a, status: "idle", currentTask: null, progress: 0, throughput: 0, queue: 0 }
      ),
      areaAgents: buildAreaAgents(),
      staff: seedStaff(),
      usedToday: { emails: 0, whatsapp: 0, calls: 0, spendUsd: 0 },
      metrics: recomputeMetrics({ leads, emails: [], whatsapp: [], calls: [] }),
    });
  },
    }),
    {
      name: "deck-config",
      // Solo se persiste la CONFIGURACIÓN (no el estado de la simulación).
      partialize: (s) => ({
        preset: s.preset,
        channelsMode: s.channelsMode,
        dailyCaps: s.dailyCaps,
        agentEnabled: s.agentEnabled,
        subagentsEnabled: s.subagentsEnabled,
        // En operación real, recuerda los leads en este dispositivo (respaldo same-device).
        ...(IS_DEMO ? {} : { leads: s.leads }),
      }),
      // No rehidratar en el primer render (evita desajustes de hidratación con SSR).
      // Se rehidrata manualmente tras montar (ver DemoClock).
      skipHydration: true,
    }
  )
);
