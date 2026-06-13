/**
 * Orquestador central (esqueleto). En producción corre como worker/cron y usa Prisma
 * + una cola (BullMQ/Redis). Aquí se documenta la lógica de coordinación de ATLAS.
 *
 * Ciclo del Director:
 *  1. Lee leads y su etapa/temperatura.
 *  2. Decide la siguiente acción por lead respetando caps diarios.
 *  3. Encola tareas para el agente correspondiente.
 *  4. Escala a humano cuando corresponde.
 */
import type { Lead, AgentId } from "@/lib/types";
import { RATE_LIMITS } from "@/lib/integrations/config";

export interface Decision {
  leadId: string;
  agent: AgentId;
  action: string;
  priority: number; // 1 (alta) .. 10 (baja)
  reason: string;
  escalateToHuman?: boolean;
}

/** Determina la siguiente acción para un lead según etapa/temperatura. */
export function decideNextAction(lead: Lead): Decision {
  const hot = lead.temperature === "hot";
  switch (lead.stage) {
    case "prospected":
      return d(lead, "research", "Investigar negocio y reputación", 4, "Lead recién prospectado");
    case "researched":
      return d(lead, "scoring", "Calcular score y temperatura", 4, "Enriquecimiento completo");
    case "qualified":
      return hot
        ? d(lead, "voice", "Llamar hoy (alta prioridad)", 1, "Lead caliente calificado")
        : d(lead, "email", "Enviar email + secuencia de seguimiento", 5, "Lead tibio/frío");
    case "contacted":
      return d(lead, "voice", "Seguimiento multicanal", hot ? 2 : 6, "Esperando respuesta");
    case "engaged":
      return {
        ...d(lead, "director", "Agendar reunión y derivar a humano", 1, "Interés alto detectado"),
        escalateToHuman: true,
      };
    case "meeting":
      return d(lead, "director", "Preparar cierre con humano", 2, "Reunión agendada");
    default:
      return d(lead, "director", "Sin acción", 9, "Estado terminal");
  }
}

/** Prioriza la cola global y respeta los límites diarios por canal. */
export function planCycle(
  leads: Lead[],
  usedToday: { emails: number; whatsapp: number; calls: number }
): Decision[] {
  const decisions = leads
    .filter((l) => l.stage !== "won" && l.stage !== "lost")
    .map(decideNextAction)
    .sort((a, b) => a.priority - b.priority);

  let calls = usedToday.calls;
  let emails = usedToday.emails;

  return decisions.filter((dec) => {
    if (dec.agent === "voice" && dec.action.includes("Llamar")) {
      if (calls >= RATE_LIMITS.callsPerDay) return false;
      calls++;
    }
    if (dec.agent === "email") {
      if (emails >= RATE_LIMITS.emailsPerDay) return false;
      emails++;
    }
    return true;
  });
}

function d(
  lead: Lead,
  agent: AgentId,
  action: string,
  priority: number,
  reason: string
): Decision {
  return { leadId: lead.id, agent, action, priority, reason };
}
