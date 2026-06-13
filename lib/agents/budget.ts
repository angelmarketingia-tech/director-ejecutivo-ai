/**
 * Control de presupuesto REAL del lado servidor (capa Claude).
 * Lleva un libro diario en memoria del gasto de API y corta cuando se alcanza el tope.
 * Para producción multi-instancia, respaldar en Redis/DB; aquí es por instancia.
 */
import { PRICES } from "@/lib/agents/pricing";
import type { ClaudeModel } from "@/lib/agents/claude";

export class BudgetExceededError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "BudgetExceededError";
  }
}

const CAP_USD = Number(process.env.LIMIT_API_SPEND_USD ?? 15);

let ledger = { date: "", spentUsd: 0 };

function ensureDay() {
  const d = new Date().toISOString().slice(0, 10);
  if (d !== ledger.date) ledger = { date: d, spentUsd: 0 };
}

/** ¿Queda presupuesto para un gasto estimado? */
export function canSpend(estUsd = 0): boolean {
  ensureDay();
  return ledger.spentUsd + estUsd < CAP_USD;
}

/** Registra el costo real de una llamada a partir de su `usage`. Devuelve el costo. */
export function recordUsage(model: ClaudeModel, usage: { input_tokens?: number; output_tokens?: number } | null | undefined): number {
  ensureDay();
  const p = PRICES[model] ?? PRICES["claude-sonnet-4-6"];
  const cost = (usage?.input_tokens ?? 0) * p.in + (usage?.output_tokens ?? 0) * p.out;
  ledger.spentUsd += cost;
  return cost;
}

export function getBudget() {
  ensureDay();
  return { date: ledger.date, spentUsd: ledger.spentUsd, capUsd: CAP_USD, remaining: Math.max(0, CAP_USD - ledger.spentUsd) };
}
