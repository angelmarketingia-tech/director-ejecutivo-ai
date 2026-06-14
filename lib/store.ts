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
} from "@/lib/demo/data";
import {
  AREA_AGENTS_SEED,
  AGENT_TASKS,
  STAFF_SEED,
  SUBAGENT_PLAYBOOK,
} from "@/lib/departments";
import {
  type Preset,
  type ChannelsMode,
  PRESETS,
  costForStep,
} from "@/lib/agents/pricing";

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
  /** Inserta leads REALES descubiertos por búsqueda web (con su fuente). Devuelve cuántos. */
  addDiscoveredLeads: (items: DiscoveredLeadInput[]) => number;
  /**
   * Ejecuta el pipeline COMPLETO sobre un lead: investigación → scoring → contacto
   * (email/llamada reales) → decisión de avance → cierre (ganado/perdido).
   * El desenlace se decide por los ATRIBUTOS REALES del lead (score, closeProbability),
   * con un evento trazable por cada paso. Devuelve la etapa final.
   */
  runLeadPipeline: (id: string) => PipelineStage;
  /** Corre el pipeline completo sobre todos los leads abiertos. Devuelve cuántos cerró. */
  closeAllOpen: () => { won: number; lost: number };
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

const initialLeads = seedLeads(14);

// ── Agentes de área (autónomos, con subagentes) ──
let SUB = 1;
let WEBSEQ = 1; // ids de leads descubiertos por web
function buildAreaAgents(): Record<Exclude<Area, "hq">, AreaAgent[]> {
  const out = {} as Record<Exclude<Area, "hq">, AreaAgent[]>;
  (Object.keys(AREA_AGENTS_SEED) as Array<Exclude<Area, "hq">>).forEach((area) => {
    out[area] = AREA_AGENTS_SEED[area].map((a) => {
      const tasks = AGENT_TASKS[a.name] ?? [{ task: "En espera de asignación", goal: "—" }];
      const t = tasks[0];
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

  running: true,
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

  agents: AGENTS_SEED.map((a) => ({ ...a })),
  leads: initialLeads,
  events: [
    evt("director", "info", "Sala de control inicializada · modo DEMO"),
    evt("prospect", "info", "Estación SCOUT en línea"),
  ],
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

  addDiscoveredLeads: (items) => {
    if (!items?.length) return 0;
    let n = 0;
    set((s) => {
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

  runLeadPipeline: (id) => {
    const s = get();
    const idx = s.leads.findIndex((l) => l.id === id);
    if (idx < 0) return "lost";

    const caps = s.dailyCaps;
    const used = { ...s.usedToday };
    const models = PRESETS[s.preset];
    const en = s.agentEnabled; // agentes encendidos (los apagados no consumen API)

    let lead = { ...s.leads[idx] };
    let events = [...s.events];
    let emails = [...s.emails];
    let calls = [...s.calls];
    let whatsapp = [...s.whatsapp];
    const push = (agent: AgentId, level: ActivityEvent["level"], message: string) => {
      events = [evt(agent, level, message), ...events].slice(0, 80);
    };
    // Suma gasto estimado del paso al consumo del día
    const spend = (agent: AgentId) => {
      used.spendUsd += costForStep(agent, models[agent]);
    };

    // GUARDA DE PRESUPUESTO: si ya se alcanzó el tope diario, no se procesa.
    if (used.spendUsd >= caps.spendUsd) {
      push("director", "warn", `⛔ Tope de gasto diario ($${caps.spendUsd}) alcanzado · ${lead.company} en espera`);
      set({ events });
      return lead.stage;
    }

    // 1) Investigación (ORACLE) — solo si el agente está encendido
    lead.stage = "researched";
    lead.ownerAgent = "research";
    if (!lead.hasWebsite && !lead.needs.includes("Sitio web profesional")) {
      lead.needs = ["Sitio web profesional", ...lead.needs];
    }
    if (en.research !== false) {
      spend("research");
      push("research", "info", `ORACLE: ${lead.company} · rating ${lead.rating}★ · presencia ${lead.digitalScore}/100`);
    }

    // 2) Scoring (FORGE)
    lead.stage = "qualified";
    lead.ownerAgent = "scoring";
    lead.nextAction = lead.temperature === "hot" ? "Llamar hoy" : "Email + seguimiento";
    if (en.scoring !== false) {
      spend("scoring");
      push("scoring", lead.temperature === "hot" ? "alert" : "info", `FORGE: score ${lead.score} → ${lead.temperature.toUpperCase()} (cierre ${lead.closeProbability}%)`);
    }

    // 3) Contacto — email (respeta tope) + WhatsApp; llamada solo en modo completo
    lead.stage = "contacted";
    lead.consent = "soft_optin";
    if (en.email !== false && used.emails < caps.emails) {
      const email: EmailRecord = {
        id: `em_${emails.length + 1}_${lead.id}`,
        leadId: lead.id,
        company: lead.company,
        subject: `${lead.company}: más clientes con ${lead.needs[0]?.toLowerCase()}`,
        template: lead.hasWebsite ? "mejora_presencia" : "sin_web",
        status: "sent",
        at: Date.now(),
      };
      emails = [email, ...emails].slice(0, 200);
      used.emails += 1;
      spend("email");
      push("email", "success", `QUILL → email enviado a ${lead.company}`);
    } else {
      push("email", "warn", `Tope de emails (${caps.emails}) alcanzado · ${lead.company} sin email`);
    }

    if (used.whatsapp < caps.whatsapp) {
      const wa: WhatsAppMessage = {
        id: `wa_${whatsapp.length + 1}_${lead.id}`,
        leadId: lead.id,
        company: lead.company,
        direction: "out",
        body: `Hola ${lead.contactName?.split(" ")[0] ?? ""}, te escribimos sobre ${lead.needs[0]?.toLowerCase()} 👋`,
        status: "delivered",
        templateName: "intro_optin",
        at: Date.now(),
      };
      whatsapp = [wa, ...whatsapp].slice(0, 200);
      used.whatsapp += 1;
      push("email", "info", `WhatsApp → ${lead.company}`);
    }

    const voiceOn = s.channelsMode === "full" && en.voice !== false;
    if (lead.temperature === "hot" && voiceOn && used.calls < caps.calls) {
      const booked = lead.closeProbability >= 50;
      const call: CallRecord = {
        id: `cl_${calls.length + 1}_${lead.id}`,
        leadId: lead.id,
        company: lead.company,
        durationSec: 90 + Math.floor(lead.closeProbability * 3),
        outcome: booked ? "meeting_booked" : "connected",
        interest: lead.score >= 70 ? "high" : "medium",
        objections: lead.closeProbability < 50 ? ["Precio"] : [],
        nextStep: booked ? "Reunión agendada" : "Enviar propuesta",
        followUpAt: Date.now() + 1000 * 60 * 60 * 24,
        closeProbability: lead.closeProbability,
        transcriptSnippet: "«Cuéntame cómo me ayudarían a conseguir más clientes…»",
        at: Date.now(),
      };
      calls = [call, ...calls].slice(0, 200);
      used.calls += 1;
      spend("voice");
      push("voice", "alert", `ECHO → llamada a ${lead.company}: ${call.outcome}`);
    } else if (lead.temperature === "hot" && !voiceOn) {
      push("voice", "info", `Modo sin voz · ${lead.company} se atiende por email/WhatsApp`);
    }

    // 4) Decisión de avance/cierre — DETERMINISTA por atributos reales del lead
    spend("director");
    if (lead.score < 45) {
      lead.stage = "lost";
      push("director", "warn", `✕ ${lead.company} perdido: score ${lead.score} bajo el umbral (45)`);
    } else {
      lead.stage = "engaged";
      lead.consent = "opt_in";
      push("director", "alert", `🔥 ${lead.company} muestra interés (score ${lead.score})`);

      if (lead.score >= 55) {
        lead.stage = "meeting";
        push("voice", "success", `Reunión agendada con ${lead.company}`);
        if (lead.closeProbability >= 50) {
          lead.stage = "won";
          push("director", "success", `✅ CIERRE ganado: ${lead.company} (cierre ${lead.closeProbability}%)`);
        } else {
          lead.stage = "lost";
          push("director", "warn", `✕ ${lead.company} perdido tras reunión: cierre ${lead.closeProbability}% < 50%`);
        }
      } else {
        lead.stage = "lost";
        push("director", "warn", `✕ ${lead.company} perdido: interés insuficiente (score ${lead.score} < 55)`);
      }
    }

    const leads = [...s.leads];
    leads[idx] = lead;
    set({
      leads,
      events,
      emails,
      calls,
      whatsapp,
      usedToday: used,
      metrics: recomputeMetrics({ leads, emails, whatsapp, calls }),
    });
    return lead.stage;
  },

  closeAllOpen: () => {
    const open = get().leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
    let won = 0;
    let lost = 0;
    for (const l of open) {
      const end = get().runLeadPipeline(l.id);
      if (end === "won") won++;
      else if (end === "lost") lost++;
    }
    return { won, lost };
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
    const leads = seedLeads(14);
    set({
      leads,
      calls: [],
      whatsapp: [],
      emails: [],
      events: [evt("director", "info", "Simulación reiniciada")],
      agents: AGENTS_SEED.map((a) => ({ ...a })),
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
      }),
      // No rehidratar en el primer render (evita desajustes de hidratación con SSR).
      // Se rehidrata manualmente tras montar (ver DemoClock).
      skipHydration: true,
    }
  )
);
