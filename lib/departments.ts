// Metadata de áreas, agentes autónomos por área y plantilla de personal real.
// Todo es ficticio y seguro para demo.

import type { Area, AreaAgent, StaffMember } from "@/lib/types";

export interface AreaMeta {
  id: Area;
  label: string;
  tagline: string;
  color: string;
  iconKey: string; // se mapea a un icono de lucide en el componente
}

export const AREAS: AreaMeta[] = [
  { id: "hq", label: "HQ · Centro de Mando", tagline: "Vista general de la compañía", color: "#EAF0FF", iconKey: "hexagon" },
  { id: "comercial", label: "Comercial", tagline: "Prospección, contacto y cierre", color: "#22D3EE", iconKey: "target" },
  { id: "marketing", label: "Marketing", tagline: "Contenido, pauta y marca", color: "#E879F9", iconKey: "megaphone" },
  { id: "directiva", label: "Directiva · Juntas", tagline: "Estrategia, KPIs y decisiones", color: "#E8C766", iconKey: "crown" },
  { id: "ingenieria", label: "Desarrollo", tagline: "Código, releases y calidad", color: "#818CF8", iconKey: "code" },
  { id: "rrhh", label: "Recursos Humanos", tagline: "Personas reales · presencia y actividad", color: "#34D399", iconKey: "users" },
];

export const AREA_BY_ID: Record<Area, AreaMeta> = Object.fromEntries(
  AREAS.map((a) => [a.id, a])
) as Record<Area, AreaMeta>;

/**
 * Catálogo de subagentes que cada agente PUEDE generar para mejorar la calidad.
 * El agente decide cuáles crear según la tarea (no para ir más rápido: para mejorar).
 */
export const SUBAGENT_PLAYBOOK: Record<string, { label: string; purpose: string }[]> = {
  default: [
    { label: "Verificador", purpose: "Refuta el borrador para eliminar errores" },
    { label: "Crítico de calidad", purpose: "Eleva el estándar del entregable" },
  ],
  // por agente (codename) se puede especializar:
  PRISM: [
    { label: "Investigador de audiencia", purpose: "Aterriza el mensaje al segmento" },
    { label: "Editor de estilo", purpose: "Pulario tono y claridad" },
    { label: "Fact-checker", purpose: "Verifica afirmaciones antes de publicar" },
  ],
  BLAZE: [
    { label: "Analista de pujas", purpose: "Optimiza CPA por audiencia" },
    { label: "Auditor de creatividades", purpose: "Descarta anuncios de bajo CTR" },
  ],
  NOVA: [
    { label: "Revisor de arquitectura", purpose: "Detecta deuda y riesgos de diseño" },
    { label: "Diseñador de pruebas", purpose: "Define casos límite antes de codificar" },
  ],
  BYTE: [
    { label: "Code reviewer", purpose: "Adversarial: busca bugs reales" },
    { label: "Verificador de tests", purpose: "Confirma cobertura y reproduce flakes" },
  ],
  HELM: [
    { label: "Analista de escenarios", purpose: "Modela 3 futuros antes de decidir" },
    { label: "Abogado del diablo", purpose: "Estresa la decisión estratégica" },
  ],
  CARE: [
    { label: "Analista de clima", purpose: "Detecta señales de carga y burnout" },
  ],
};

/** Agentes autónomos por área (codename + rol). HQ no tiene estación propia. */
export const AREA_AGENTS_SEED: Record<Exclude<Area, "hq">, Omit<AreaAgent, "mode" | "task" | "goal" | "taskProgress" | "subagents" | "completedTasks" | "qualityScore">[]> = {
  comercial: [
    { id: "ag_scout", area: "comercial", name: "SCOUT", role: "Prospección web", color: "#22D3EE" },
    { id: "ag_oracle", area: "comercial", name: "ORACLE", role: "Investigación de mercado", color: "#A78BFA" },
    { id: "ag_forge", area: "comercial", name: "FORGE", role: "Captura y scoring", color: "#FBBF24" },
    { id: "ag_quill", area: "comercial", name: "QUILL", role: "Email marketing", color: "#34D399" },
    { id: "ag_echo", area: "comercial", name: "ECHO", role: "Voz y cierre", color: "#FB7185" },
  ],
  marketing: [
    { id: "ag_prism", area: "marketing", name: "PRISM", role: "Contenido y narrativa", color: "#E879F9" },
    { id: "ag_blaze", area: "marketing", name: "BLAZE", role: "Pauta / Ads", color: "#FB7185" },
    { id: "ag_pulse", area: "marketing", name: "PULSE", role: "Redes y comunidad", color: "#22D3EE" },
    { id: "ag_beacon", area: "marketing", name: "BEACON", role: "SEO y analítica", color: "#FBBF24" },
  ],
  ingenieria: [
    { id: "ag_nova", area: "ingenieria", name: "NOVA", role: "Arquitectura", color: "#818CF8" },
    { id: "ag_byte", area: "ingenieria", name: "BYTE", role: "Implementación", color: "#22D3EE" },
    { id: "ag_lint", area: "ingenieria", name: "LINT", role: "Revisión y QA", color: "#FBBF24" },
    { id: "ag_ship", area: "ingenieria", name: "SHIP", role: "DevOps y releases", color: "#34D399" },
  ],
  directiva: [
    { id: "ag_helm", area: "directiva", name: "HELM", role: "Estrategia y orquestación ejecutiva", color: "#E8C766" },
  ],
  rrhh: [
    { id: "ag_care", area: "rrhh", name: "CARE", role: "Bienestar y supervisión de equipo", color: "#34D399" },
  ],
};

/** Tareas de ejemplo (end-to-end) por agente, para la simulación. */
export const AGENT_TASKS: Record<string, { task: string; goal: string }[]> = {
  PRISM: [
    { task: "Escribiendo la landing de la campaña Q3", goal: "Landing publicada y aprobada" },
    { task: "Guion del lanzamiento de producto", goal: "Guion listo para grabación" },
  ],
  BLAZE: [{ task: "Optimizando campaña de Meta Ads", goal: "CPA por debajo del objetivo" }],
  PULSE: [{ task: "Calendario de contenidos de la semana", goal: "7 posts programados" }],
  BEACON: [{ task: "Auditoría SEO del sitio", goal: "Plan de mejoras priorizado" }],
  NOVA: [{ task: "Diseñando el módulo de facturación", goal: "ADR y diagrama aprobados" }],
  BYTE: [{ task: "Implementando el endpoint de pagos", goal: "PR con tests en verde" }],
  LINT: [{ task: "Revisando el PR #482", goal: "0 bugs críticos, aprobado" }],
  SHIP: [{ task: "Preparando release v1.4", goal: "Desplegado sin incidencias" }],
  HELM: [{ task: "Consolidando KPIs para la junta", goal: "Reporte ejecutivo listo" }],
  CARE: [{ task: "Revisando carga del equipo", goal: "Alertas de bienestar emitidas" }],
};

// ───────────────────────── Personal REAL ─────────────────────────
// Personas reales de la empresa. RR.HH. las supervisa; cada una marca su actividad.

export const STAFF_SEED: Omit<StaffMember, "activitySince">[] = [
  { id: "u_ana", name: "Ana Reyes", role: "Head of Marketing", department: "marketing", initials: "AR", color: "#E879F9", presence: "busy", activity: "Brief de campaña Q3 con PRISM", checkinsToday: 3, assistAgentId: "ag_prism" },
  { id: "u_marco", name: "Marco Díaz", role: "Diseñador", department: "marketing", initials: "MD", color: "#E879F9", presence: "online", activity: "Diseñando piezas para Meta Ads", checkinsToday: 2, assistAgentId: "ag_blaze" },
  { id: "u_lucia", name: "Lucía Pérez", role: "Tech Lead", department: "ingenieria", initials: "LP", color: "#818CF8", presence: "busy", activity: "Revisando arquitectura de pagos con NOVA", checkinsToday: 4, assistAgentId: "ag_nova" },
  { id: "u_diego", name: "Diego Salas", role: "Backend Dev", department: "ingenieria", initials: "DS", color: "#818CF8", presence: "online", activity: "Endpoint de pagos · PR #482", checkinsToday: 5, assistAgentId: "ag_byte" },
  { id: "u_sofia", name: "Sofía Mena", role: "QA Engineer", department: "ingenieria", initials: "SM", color: "#818CF8", presence: "online", activity: "Pruebas de regresión del checkout", checkinsToday: 2, assistAgentId: "ag_lint" },
  { id: "u_carlos", name: "Carlos Vera", role: "SDR", department: "comercial", initials: "CV", color: "#22D3EE", presence: "meeting", activity: "Llamada con lead caliente (La Trattoria)", checkinsToday: 6, assistAgentId: "ag_echo" },
  { id: "u_paula", name: "Paula Ortiz", role: "Account Executive", department: "comercial", initials: "PO", color: "#22D3EE", presence: "busy", activity: "Preparando propuesta para cierre", checkinsToday: 3 },
  { id: "u_jorge", name: "Jorge Luna", role: "CEO", department: "directiva", initials: "JL", color: "#E8C766", presence: "meeting", activity: "Junta de estrategia trimestral", checkinsToday: 1, assistAgentId: "ag_helm" },
  { id: "u_valeria", name: "Valeria Cruz", role: "COO", department: "directiva", initials: "VC", color: "#E8C766", presence: "online", activity: "Revisando KPIs operativos", checkinsToday: 2, assistAgentId: "ag_helm" },
  { id: "u_andrea", name: "Andrea Soto", role: "People Ops", department: "rrhh", initials: "AS", color: "#34D399", presence: "online", activity: "Onboarding de nuevo ingeniero", checkinsToday: 4, assistAgentId: "ag_care" },
  { id: "u_tomas", name: "Tomás Río", role: "Recruiter", department: "rrhh", initials: "TR", color: "#34D399", presence: "away", activity: "Entrevistas técnicas", checkinsToday: 2 },
];

export const PRESENCE_LABEL: Record<StaffMember["presence"], string> = {
  online: "Disponible",
  busy: "Ocupado",
  meeting: "En junta",
  away: "Ausente",
  offline: "Desconectado",
};

export const PRESENCE_COLOR: Record<StaffMember["presence"], string> = {
  online: "#34D399",
  busy: "#FBBF24",
  meeting: "#A78BFA",
  away: "#8A97B8",
  offline: "#5A678C",
};

export const ACTIVITY_SUGGESTIONS = [
  "En foco profundo",
  "En reunión",
  "Revisando entregables con su agente",
  "Atendiendo a un cliente",
  "Almuerzo",
  "Documentando",
  "Disponible para soporte",
];
