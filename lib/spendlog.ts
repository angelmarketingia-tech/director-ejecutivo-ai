/**
 * Auditoría de gasto de tokens/IA: cada llamada a Claude queda registrada con QUIÉN la
 * disparó y EN QUÉ (acción), con su costo en USD. Persistido en Vercel KV para que el
 * admin vea exactamente en qué se gastó. Sin KV, no se registra (pero la app funciona).
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";
import { getBudget } from "@/lib/agents/budget";
import { currentUser } from "@/lib/security";

export interface SpendEntry {
  at: number;
  user: string; // id del usuario (admin/juan/david) o "desconocido"
  name: string;
  action: string; // ej. "proyecto:build", "agente:research", "web:AVEMARÍA"
  costUsd: number;
}

const KEY = "spend:v1";
const MAX = 3000;

export async function getSpend(): Promise<SpendEntry[]> {
  if (!kvConfigured()) return [];
  return (await kvGetJSON<SpendEntry[]>(KEY)) ?? [];
}

export async function logSpend(entry: SpendEntry): Promise<void> {
  if (!kvConfigured() || !(entry.costUsd > 0)) return;
  const list = await getSpend();
  list.unshift(entry);
  await kvSetJSON(KEY, list.slice(0, MAX));
}

/**
 * Envuelve una operación que llama a Claude: mide el costo (delta del presupuesto) y lo
 * registra atribuido al usuario actual. Devuelve lo que devuelva `fn`.
 */
export async function withSpend<T>(req: Request, action: string, fn: () => Promise<T>): Promise<T> {
  const before = getBudget().spentUsd;
  let user = { id: "desconocido", name: "Desconocido" };
  try {
    const u = await currentUser(req);
    if (u) user = { id: u.id, name: u.name };
  } catch {}
  try {
    return await fn();
  } finally {
    const cost = Math.max(0, getBudget().spentUsd - before);
    if (cost > 0) {
      // No bloquea la respuesta si KV falla.
      logSpend({ at: Date.now(), user: user.id, name: user.name, action, costUsd: Number(cost.toFixed(6)) }).catch(() => {});
    }
  }
}
