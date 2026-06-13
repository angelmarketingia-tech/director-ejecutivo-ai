import type { AgentStatus, EventLevel, LeadTemperature, PipelineStage } from "@/lib/types";

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  active: "Activo",
  prospecting: "Prospectando",
  researching: "Investigando",
  scoring: "Calificando",
  writing: "Escribiendo",
  calling: "Llamando",
  waiting: "Esperando",
  blocked: "Bloqueado",
  idle: "En espera",
};

export const TEMP_LABEL: Record<LeadTemperature, string> = {
  cold: "Frío",
  warm: "Tibio",
  hot: "Caliente",
};

export const TEMP_COLOR: Record<LeadTemperature, string> = {
  cold: "#60A5FA",
  warm: "#FBBF24",
  hot: "#FB7185",
};

export const LEVEL_COLOR: Record<EventLevel, string> = {
  info: "#8A97B8",
  success: "#34D399",
  warn: "#FBBF24",
  alert: "#FB7185",
};

export const STAGE_TINT: Record<PipelineStage, string> = {
  prospected: "#22D3EE",
  researched: "#A78BFA",
  qualified: "#FBBF24",
  contacted: "#34D399",
  engaged: "#FB7185",
  meeting: "#E8C766",
  won: "#34D399",
  lost: "#5A678C",
};
