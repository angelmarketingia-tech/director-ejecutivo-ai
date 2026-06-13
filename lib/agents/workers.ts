/**
 * Workers de agente: cada función ejecuta un agente real de Claude para una tarea
 * concreta y devuelve datos tipados. El orquestador (lib/agents/orchestrator.ts)
 * encola y dispara estas funciones; aquí está la lógica de "una tarea = una llamada".
 *
 * Todas son seguras de llamar sin red en modo demo: si falta ANTHROPIC_API_KEY,
 * `runAgent` lanza un error claro que el llamador puede capturar para caer a la
 * simulación local.
 */
import type { Lead } from "@/lib/types";
import { runAgent } from "@/lib/agents/claude";
import {
  PROSPECT_SCHEMA,
  RESEARCH_SCHEMA,
  SCORING_SCHEMA,
  EMAIL_SCHEMA,
  VOICE_SCHEMA,
  DIRECTOR_SCHEMA,
} from "@/lib/agents/schemas";

// ── SCOUT: prospección ──
export interface ProspectedLead {
  name: string;
  category: string;
  city: string;
  country: string;
  address?: string;
  website?: string | null;
  hasWebsite: boolean;
  rating?: number;
  reviews?: number;
  source?: string;
  externalId?: string;
  opportunityReason: string;
}

export async function prospect(input: {
  niche: string;
  city: string;
  service: string;
  candidates?: Array<{ name: string; category: string; website?: string | null }>;
}) {
  const prompt = [
    `Nicho: ${input.niche}`,
    `Ciudad: ${input.city}`,
    `Servicio a ofertar: ${input.service}`,
    input.candidates?.length
      ? `Candidatos detectados (de Google Places u otra fuente permitida):\n${JSON.stringify(
          input.candidates,
          null,
          2
        )}`
      : "Sin candidatos provistos: razona qué tipos de negocio del nicho serían buenos leads y descríbelos como plantilla (no inventes datos de contacto reales).",
    "Devuelve los leads priorizando los que NO tienen web o tienen mala presencia digital.",
  ].join("\n\n");

  return runAgent<{ leads: ProspectedLead[] }>({
    agent: "prospect",
    input: prompt,
    schema: PROSPECT_SCHEMA,
    effort: "low",
  });
}

// ── ORACLE: investigación ──
export interface ResearchResult {
  digitalScore: number;
  strengths?: string[];
  gaps?: string[];
  needs: string[];
  hook: string;
  competitorNote?: string;
}

export async function research(lead: Partial<Lead> & { company: string }) {
  const prompt =
    `Investiga este negocio y devuelve contexto accionable para personalizar el contacto.\n` +
    JSON.stringify(
      {
        company: lead.company,
        category: lead.category,
        city: lead.city,
        website: lead.website,
        hasWebsite: lead.hasWebsite,
        rating: lead.rating,
        reviews: lead.reviews,
      },
      null,
      2
    );
  return runAgent<ResearchResult>({
    agent: "research",
    input: prompt,
    schema: RESEARCH_SCHEMA,
  });
}

// ── FORGE: scoring ──
export interface ScoringResult {
  score: number;
  temperature: "cold" | "warm" | "hot";
  closeProbability: number;
  nextAction: string;
  priority: number;
  reason: string;
}

export async function score(input: {
  lead: Partial<Lead> & { company: string };
  research?: ResearchResult;
  service: string;
}) {
  const prompt =
    `Calcula el score comercial de este lead para el servicio "${input.service}".\n` +
    JSON.stringify({ lead: input.lead, research: input.research }, null, 2);
  return runAgent<ScoringResult>({
    agent: "scoring",
    input: prompt,
    schema: SCORING_SCHEMA,
    effort: "low",
  });
}

// ── QUILL: email ──
export interface EmailResult {
  subject: string;
  body: string;
  template: string;
  followUpPlan?: Array<{ delayDays: number; subject: string; body: string }>;
  requiresHumanReview: boolean;
}

export async function writeEmail(input: {
  lead: Partial<Lead> & { company: string; contactName?: string };
  research?: ResearchResult;
  service: string;
}) {
  const prompt =
    `Redacta un email comercial para ofrecer "${input.service}". ` +
    `Usa el hook de investigación y respeta la estructura obligatoria (promesa, valor, oferta, prueba, CTA, opt-out).\n` +
    JSON.stringify({ lead: input.lead, research: input.research }, null, 2);
  return runAgent<EmailResult>({
    agent: "email",
    input: prompt,
    schema: EMAIL_SCHEMA,
  });
}

// ── ECHO: voz / cierre ──
export interface VoiceResult {
  script: string;
  outcome:
    | "connected"
    | "voicemail"
    | "no_answer"
    | "callback"
    | "not_interested"
    | "meeting_booked";
  interest: "low" | "medium" | "high";
  objections?: string[];
  nextStep: string;
  followUpInDays?: number;
  closeProbability: number;
  leadStage: string;
  transcriptSummary?: string;
}

export async function planCall(input: {
  lead: Partial<Lead> & { company: string; contactName?: string };
  research?: ResearchResult;
  service: string;
}) {
  const prompt =
    `Prepara el guion de llamada y, dado el contexto, simula un resultado plausible de calificación ` +
    `para ofrecer "${input.service}". Registra objeciones, interés, siguiente paso y probabilidad de cierre.\n` +
    JSON.stringify({ lead: input.lead, research: input.research }, null, 2);
  return runAgent<VoiceResult>({
    agent: "voice",
    input: prompt,
    schema: VOICE_SCHEMA,
  });
}

// ── ATLAS: orquestación ──
export interface DirectorDecision {
  leadId: string;
  agent: "prospect" | "research" | "scoring" | "email" | "voice" | "director";
  action: string;
  priority: number;
  reason: string;
  escalateToHuman?: boolean;
}

export async function direct(input: {
  leads: Array<Pick<Lead, "id" | "company" | "stage" | "temperature" | "closeProbability">>;
  caps: { emails: number; calls: number; whatsapp: number };
  usedToday: { emails: number; calls: number; whatsapp: number };
}) {
  const prompt =
    `Eres ATLAS. Prioriza la cola y asigna la siguiente acción por lead respetando los límites diarios.\n` +
    JSON.stringify(input, null, 2);
  return runAgent<{ decisions: DirectorDecision[]; summary: string }>({
    agent: "director",
    input: prompt,
    schema: DIRECTOR_SCHEMA,
    effort: "high",
  });
}
