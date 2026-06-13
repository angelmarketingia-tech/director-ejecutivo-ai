// Datos demo SEGUROS: empresas, nombres y contactos ficticios. Ningún dato real.
// Sirven para que la sala de control "cobre vida" sin tocar APIs externas.

import type {
  Agent,
  Lead,
  LeadTemperature,
  PipelineStage,
} from "@/lib/types";

export const AGENTS_SEED: Agent[] = [
  {
    id: "director",
    name: "ATLAS",
    role: "Director Comercial AI",
    color: "#E8C766",
    status: "active",
    currentTask: "Supervisando 5 estaciones · balanceando carga",
    progress: 0,
    throughput: 0,
    queue: 0,
  },
  {
    id: "prospect",
    name: "SCOUT",
    role: "Prospección Web",
    color: "#22D3EE",
    status: "prospecting",
    currentTask: null,
    progress: 0,
    throughput: 0,
    queue: 12,
  },
  {
    id: "research",
    name: "ORACLE",
    role: "Investigación de Mercado",
    color: "#A78BFA",
    status: "researching",
    currentTask: null,
    progress: 0,
    throughput: 0,
    queue: 8,
  },
  {
    id: "scoring",
    name: "FORGE",
    role: "Captura · Enriquecimiento · Scoring",
    color: "#FBBF24",
    status: "scoring",
    currentTask: null,
    progress: 0,
    throughput: 0,
    queue: 6,
  },
  {
    id: "email",
    name: "QUILL",
    role: "Email Marketing",
    color: "#34D399",
    status: "writing",
    currentTask: null,
    progress: 0,
    throughput: 0,
    queue: 9,
  },
  {
    id: "voice",
    name: "ECHO",
    role: "Voz y Cierre",
    color: "#FB7185",
    status: "calling",
    currentTask: null,
    progress: 0,
    throughput: 0,
    queue: 4,
  },
];

const COMPANY_PREFIX = [
  "La",
  "El",
  "Grupo",
  "Casa",
  "Estudio",
  "Clínica",
  "Taller",
  "Restaurante",
  "Café",
  "Boutique",
  "Centro",
  "Distribuidora",
];
const COMPANY_CORE = [
  "Trattoria",
  "Andina",
  "Dental Sonríe",
  "Mecánica Veloz",
  "Belleza Pura",
  "Sabor Criollo",
  "Inmobiliaria Sur",
  "Ferretería Norte",
  "Óptica Visión",
  "Veterinaria Patitas",
  "Gimnasio Titan",
  "Panadería Aurora",
  "Spa Serenidad",
  "Abogados Lex",
  "Contadores Cifra",
  "Logística Express",
];
const CATEGORIES = [
  "Restaurante",
  "Clínica dental",
  "Taller mecánico",
  "Estética / Spa",
  "Inmobiliaria",
  "Retail local",
  "Servicios legales",
  "Gimnasio",
  "Veterinaria",
  "Distribuidora B2B",
];
const CITIES: Array<[string, string]> = [
  ["Quito", "Ecuador"],
  ["Guayaquil", "Ecuador"],
  ["Cuenca", "Ecuador"],
  ["Bogotá", "Colombia"],
  ["Medellín", "Colombia"],
  ["Lima", "Perú"],
  ["Ciudad de México", "México"],
  ["Monterrey", "México"],
];
const FIRST = ["María", "Carlos", "Andrea", "Luis", "Sofía", "Diego", "Paula", "Jorge"];
const LAST = ["Vaca", "Torres", "Mendoza", "Rojas", "Castro", "Herrera", "Flores", "Núñez"];
const NEEDS_POOL = [
  "Sitio web profesional",
  "Página de servicios",
  "Automatización comercial",
  "Marketing digital",
  "CRM",
  "Agente de llamadas",
  "Reservas online",
  "Google Business optimizado",
];

let SEQ = 1;
// PRNG determinista por defecto para que el seed inicial sea estable (evita Math.random en SSR).
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = <T,>(arr: T[], r: number) => arr[Math.floor(r * arr.length)];

export function generateLead(rng: () => number = Math.random): Lead {
  const [city, country] = pick(CITIES, rng());
  const hasWebsite = rng() > 0.55;
  const digitalScore = hasWebsite
    ? 35 + Math.floor(rng() * 50)
    : 5 + Math.floor(rng() * 25);
  const rating = Number((3 + rng() * 2).toFixed(1));
  const reviews = Math.floor(rng() * 480);

  // Score comercial: penaliza buena presencia digital (menos necesidad),
  // premia rating alto con poca digitalización (negocio sano pero mal posicionado).
  const opportunity = 100 - digitalScore;
  const traction = (rating / 5) * 40 + Math.min(reviews / 480, 1) * 20;
  const score = Math.max(
    8,
    Math.min(99, Math.round(opportunity * 0.6 + traction * 0.4 + (rng() * 12 - 6)))
  );

  const temperature: LeadTemperature =
    score >= 72 ? "hot" : score >= 48 ? "warm" : "cold";

  const needs = [...NEEDS_POOL]
    .sort(() => rng() - 0.5)
    .slice(0, 2 + Math.floor(rng() * 2));
  if (!hasWebsite && !needs.includes("Sitio web profesional"))
    needs.unshift("Sitio web profesional");

  const company = `${pick(COMPANY_PREFIX, rng())} ${pick(COMPANY_CORE, rng())}`;
  const slug = company.toLowerCase().replace(/[^a-z]/g, "");

  return {
    id: `ld_${(SEQ++).toString().padStart(5, "0")}`,
    company,
    category: pick(CATEGORIES, rng()),
    city,
    country,
    contactName: `${pick(FIRST, rng())} ${pick(LAST, rng())}`,
    phone: `+593 9${Math.floor(rng() * 9)} ${Math.floor(1000000 + rng() * 8999999)}`,
    email: `contacto@${slug}.demo`,
    website: hasWebsite ? `https://${slug}.demo` : null,
    hasWebsite,
    digitalScore,
    rating,
    reviews,
    score,
    temperature,
    stage: "prospected",
    closeProbability: Math.round(score * 0.6 + rng() * 20),
    needs,
    consent: "none",
    createdAt: Date.now(),
    ownerAgent: "prospect",
  };
}

export const STAGE_ORDER: PipelineStage[] = [
  "prospected",
  "researched",
  "qualified",
  "contacted",
  "engaged",
  "meeting",
  "won",
];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  prospected: "Prospectado",
  researched: "Investigado",
  qualified: "Calificado",
  contacted: "Contactado",
  engaged: "Interesado",
  meeting: "Reunión",
  won: "Cerrado",
  lost: "Perdido",
};

// Lote inicial estable (SSR-safe) para que la primera pintura no esté vacía.
export function seedLeads(count = 14): Lead[] {
  const rng = makeRng(20260613);
  const leads: Lead[] = [];
  for (let i = 0; i < count; i++) {
    const lead = generateLead(rng);
    // Distribuye el lote inicial a lo largo del pipeline para una demo rica.
    const stageIdx = Math.min(STAGE_ORDER.length - 1, Math.floor(rng() * 6));
    lead.stage = STAGE_ORDER[stageIdx];
    lead.createdAt = Date.now() - Math.floor(rng() * 1000 * 60 * 60 * 6);
    leads.push(lead);
  }
  return leads;
}
