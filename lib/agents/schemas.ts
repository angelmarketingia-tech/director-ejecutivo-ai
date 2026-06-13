/**
 * JSON Schemas de salida estructurada para cada agente.
 * Reglas de structured outputs: todo objeto lleva additionalProperties:false;
 * no se admiten min/max ni longitudes (se validan en el worker si hace falta).
 */

const obj = (
  properties: Record<string, unknown>,
  required: string[]
) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});

const str = { type: "string" };
const num = { type: "number" };
const int = { type: "integer" };
const bool = { type: "boolean" };
const strArr = { type: "array", items: { type: "string" } };

// SCOUT — prospección
export const PROSPECT_SCHEMA = obj(
  {
    leads: {
      type: "array",
      items: obj(
        {
          name: str,
          category: str,
          city: str,
          country: str,
          address: str,
          website: { type: ["string", "null"] },
          hasWebsite: bool,
          rating: num,
          reviews: int,
          source: str,
          externalId: str,
          opportunityReason: str,
        },
        ["name", "category", "city", "country", "hasWebsite", "opportunityReason"]
      ),
    },
  },
  ["leads"]
);

// ORACLE — investigación / enriquecimiento
export const RESEARCH_SCHEMA = obj(
  {
    digitalScore: int,
    strengths: strArr,
    gaps: strArr,
    needs: strArr,
    hook: str,
    competitorNote: str,
  },
  ["digitalScore", "needs", "hook"]
);

// FORGE — scoring
export const SCORING_SCHEMA = obj(
  {
    score: int,
    temperature: { type: "string", enum: ["cold", "warm", "hot"] },
    closeProbability: int,
    nextAction: str,
    priority: int,
    reason: str,
  },
  ["score", "temperature", "closeProbability", "nextAction", "priority", "reason"]
);

// QUILL — email
export const EMAIL_SCHEMA = obj(
  {
    subject: str,
    body: str,
    template: str,
    followUpPlan: {
      type: "array",
      items: obj({ delayDays: int, subject: str, body: str }, ["delayDays", "subject", "body"]),
    },
    requiresHumanReview: bool,
  },
  ["subject", "body", "template", "requiresHumanReview"]
);

// ECHO — voz / cierre (resultado de llamada)
export const VOICE_SCHEMA = obj(
  {
    script: str,
    outcome: {
      type: "string",
      enum: ["connected", "voicemail", "no_answer", "callback", "not_interested", "meeting_booked"],
    },
    interest: { type: "string", enum: ["low", "medium", "high"] },
    objections: strArr,
    nextStep: str,
    followUpInDays: int,
    closeProbability: int,
    leadStage: str,
    transcriptSummary: str,
  },
  ["script", "outcome", "interest", "nextStep", "closeProbability", "leadStage"]
);

// ATLAS — orquestación / decisiones
export const DIRECTOR_SCHEMA = obj(
  {
    decisions: {
      type: "array",
      items: obj(
        {
          leadId: str,
          agent: { type: "string", enum: ["prospect", "research", "scoring", "email", "voice", "director"] },
          action: str,
          priority: int,
          reason: str,
          escalateToHuman: bool,
        },
        ["leadId", "agent", "action", "priority", "reason"]
      ),
    },
    summary: str,
  },
  ["decisions", "summary"]
);
