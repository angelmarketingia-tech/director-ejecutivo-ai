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
import { runAgent, runRaw } from "@/lib/agents/claude";
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
  seller?: { name: string; business: string; phone: string };
}) {
  const sellerLine = input.seller
    ? `FIRMA el mensaje EXACTAMENTE con estos datos reales (sin corchetes ni placeholders): ` +
      `${input.seller.name} · ${input.seller.business} · ${input.seller.phone}. `
    : "";
  const prompt =
    `Redacta un email comercial para ofrecer "${input.service}". ` +
    `Usa el hook de investigación y respeta la estructura obligatoria (promesa, valor, oferta, prueba, CTA, opt-out). ` +
    `IMPORTANTE: el "body" debe estar COMPLETO de principio a fin (no lo cortes). ` +
    `NO uses placeholders entre corchetes ni llaves: escribe el texto final listo para enviar. ` +
    sellerLine +
    `Mantén followUpPlan corto (máximo 1 seguimiento) o vacío.\n` +
    JSON.stringify({ lead: input.lead, research: input.research }, null, 2);
  return runAgent<EmailResult>({
    agent: "email",
    input: prompt,
    schema: EMAIL_SCHEMA,
    // Vercel Pro: más esfuerzo y tokens → mensajes más persuasivos y completos.
    effort: "medium",
    maxTokens: 3500,
  });
}

// ── QUILL (WhatsApp): primer mensaje en frío, corto y de alto cierre ──
const WA_OPENER_SYSTEM = `Eres un closer experto en ventas por WhatsApp para una agencia de páginas web de
VILLAVICENCIO (Meta, Colombia) llamada Daptux.IA. Escribes el PRIMER mensaje en frío a un negocio local.

OBJETIVO: que el dueño RESPONDA. No vender de una; despertar curiosidad y bajar la fricción a cero.

REGLAS DEL MENSAJE (campo "message"):
- MUY corto: 2 a 4 frases, máximo ~360 caracteres. Tono cercano, llanero, humano (trato de "tú"). NADA de sonar a robot ni a plantilla.
- Empieza personalizando con el negocio real (nombre + rubro/ciudad) para que vea que NO es masivo.
- Toca UN dolor concreto y creíble según la investigación (ej.: "no apareces cuando te buscan en Google", "no tienes página y la gente confía menos / te buscan y no te encuentran", "tu competencia ya tiene web").
- Genera intriga: insinúa que viste algo puntual que le está costando clientes, sin soltarlo todo.
- ÁNGULO DE CIERRE (el más efectivo): ofrece armarle una DEMO FUNCIONAL de su página TOTALMENTE GRATIS si te da el OK. Pide autorización, no pidas plata.
- Menciona sutil que son de Villavicencio (cercanía/confianza). NO incluyas links ni precios todavía.
- Termina con UNA sola pregunta fácil de responder que invite al "sí" (ej.: "¿te la armo y te la muestro?").
- 1 o 2 emojis máximo, naturales. Sin asuntos, sin firmas largas, sin corchetes ni placeholders.

Devuelve { message }.`;

const WA_OPENER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { message: { type: "string" } },
  required: ["message"],
} as const;

export async function writeWhatsAppOpener(input: {
  lead: Partial<Lead> & { company: string; contactName?: string };
  research?: ResearchResult;
}) {
  const first = input.lead.contactName?.split(" ")[0];
  const prompt =
    `Escribe el primer mensaje de WhatsApp para este negocio.` +
    (first ? ` Si suena natural, salúdalo por su nombre: ${first}.` : "") +
    `\n` +
    JSON.stringify({ lead: input.lead, research: input.research }, null, 2);
  return runRaw<{ message: string }>({
    system: WA_OPENER_SYSTEM,
    model: "claude-sonnet-4-6",
    input: prompt,
    schema: WA_OPENER_SCHEMA as unknown as Record<string, unknown>,
    effort: "medium",
    maxTokens: 600,
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
