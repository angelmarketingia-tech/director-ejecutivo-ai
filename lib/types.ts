// Tipos de dominio compartidos por el frontend (demo) y el backend (Prisma).
// Mantener alineados con prisma/schema.prisma.

export type AgentId =
  | "director"
  | "prospect"
  | "research"
  | "scoring"
  | "email"
  | "voice";

export type AgentStatus =
  | "active" // trabajando de forma genérica
  | "prospecting"
  | "researching"
  | "scoring"
  | "writing"
  | "calling"
  | "waiting"
  | "blocked"
  | "idle";

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  color: string; // hex de firma
  status: AgentStatus;
  /** Acción legible en curso, ej: "Analizando reseñas de La Trattoria" */
  currentTask: string | null;
  /** 0-100, progreso de la tarea actual */
  progress: number;
  /** Métrica principal del agente, ej. leads encontrados, emails enviados */
  throughput: number;
  /** Cola de tareas pendientes */
  queue: number;
}

export type LeadTemperature = "cold" | "warm" | "hot";

export type PipelineStage =
  | "prospected" // detectado por prospección
  | "researched" // investigado
  | "qualified" // scoring asignado
  | "contacted" // email/whatsapp enviado
  | "engaged" // respondió / interesado
  | "meeting" // reunión agendada
  | "won" // cerrado
  | "lost";

export interface Lead {
  id: string;
  company: string;
  category: string; // restaurante, clínica, taller...
  city: string;
  country: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string | null; // null = sin web (oportunidad fuerte)
  hasWebsite: boolean;
  digitalScore: number; // 0-100 presencia digital actual
  rating?: number; // reseñas Google
  reviews?: number;
  score: number; // 0-100 score comercial calculado
  temperature: LeadTemperature;
  stage: PipelineStage;
  closeProbability: number; // 0-100
  needs: string[]; // servicios potenciales detectados
  nextAction?: string;
  nextActionAt?: number; // epoch ms
  consent: "none" | "soft_optin" | "opt_in" | "opt_out";
  createdAt: number;
  ownerAgent: AgentId;
  /** Procedencia real: URL de la fuente donde se halló (búsqueda web). */
  sourceUrl?: string;
  /** Perfiles sociales reales encontrados (URLs). */
  socials?: string[];
  /** true = datos obtenidos de una fuente real (no simulado). */
  verified?: boolean;
}

export type ChannelType = "email" | "whatsapp" | "call";

export interface CallRecord {
  id: string;
  leadId: string;
  company: string;
  durationSec: number;
  outcome:
    | "connected"
    | "voicemail"
    | "no_answer"
    | "callback"
    | "not_interested"
    | "meeting_booked";
  interest: "low" | "medium" | "high";
  objections: string[];
  nextStep?: string;
  followUpAt?: number;
  closeProbability: number;
  transcriptSnippet: string;
  at: number;
}

export interface WhatsAppMessage {
  id: string;
  leadId: string;
  company: string;
  direction: "out" | "in";
  body: string;
  status: "queued" | "sent" | "delivered" | "read" | "replied";
  templateName?: string;
  at: number;
}

export interface EmailRecord {
  id: string;
  leadId: string;
  company: string;
  subject: string;
  template: string;
  status: "queued" | "sent" | "opened" | "clicked" | "replied" | "bounced";
  at: number;
}

export type EventLevel = "info" | "success" | "warn" | "alert";

export interface ActivityEvent {
  id: string;
  agent: AgentId;
  level: EventLevel;
  message: string;
  at: number;
}

export interface Metrics {
  leadsFound: number;
  leadsQualified: number;
  emailsSent: number;
  whatsappSent: number;
  callsMade: number;
  meetingsBooked: number;
  dealsWon: number;
  hotLeads: number;
  revenue: number; // pipeline ponderado estimado
  conversionRate: number; // %
}

export interface Campaign {
  id: string;
  name: string;
  niche: string;
  city: string;
  service: string;
  status: "draft" | "running" | "paused" | "completed";
  dailyEmailCap: number;
  dailyCallCap: number;
  dailyWhatsappCap: number;
}

// ───────────────────────── Centro de mando corporativo ─────────────────────────

export type Area =
  | "hq"
  | "comercial"
  | "marketing"
  | "directiva"
  | "ingenieria"
  | "rrhh";

/** Subagente generado dinámicamente por un agente para mejorar la CALIDAD del resultado. */
export interface Subagent {
  id: string;
  label: string; // ej. "Verificador de hechos", "Revisor de tono"
  purpose: string; // por qué se creó (qué mejora aporta)
  progress: number; // 0-100
  status: "spawning" | "working" | "done";
}

export type AgentMode =
  | "planning" // descomponiendo la tarea
  | "working" // ejecutando de inicio a fin
  | "spawning" // creando subagentes
  | "synthesizing" // integrando resultados de subagentes
  | "reviewing" // verificando calidad
  | "done"
  | "idle"
  | "blocked";

/**
 * Agente autónomo de un área: capaz de llevar una tarea de inicio a fin y de
 * generar sus propios subagentes para mejorar la calidad (no la velocidad).
 */
export interface AreaAgent {
  id: string;
  area: Area;
  name: string; // codename, ej. PRISM
  role: string; // función, ej. "Contenido y narrativa"
  color: string;
  mode: AgentMode;
  /** Tarea actual de extremo a extremo. */
  task: string | null;
  /** Objetivo final de la tarea (definición de "terminado"). */
  goal: string | null;
  taskProgress: number; // 0-100, inicio→fin
  subagents: Subagent[];
  completedTasks: number;
  qualityScore: number; // 0-100, calidad media de entregables
}

export type Presence = "online" | "busy" | "meeting" | "away" | "offline";

/** Persona REAL de la empresa, supervisada por RR.HH. Marca su actividad. */
export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: Exclude<Area, "hq">;
  initials: string;
  color: string;
  presence: Presence;
  /** Qué está haciendo ahora mismo (lo marca la persona). */
  activity: string;
  /** Cuándo marcó esa actividad (epoch ms) → la sala muestra "hace X". */
  activitySince: number;
  checkinsToday: number;
  /** Agente IA asignado que asiste a esta persona. */
  assistAgentId?: string;
}
