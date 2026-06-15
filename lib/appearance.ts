/**
 * Personalización de los personajes (look + nombre) por id de agente/persona.
 * Guardado en KV → se ve igual en todos los dispositivos.
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";
import type { Look } from "@/lib/avatar";

const KEY = "looks:v1";

export async function getLooks(): Promise<Record<string, Look>> {
  if (!kvConfigured()) return {};
  return (await kvGetJSON<Record<string, Look>>(KEY)) ?? {};
}

export async function saveLook(id: string, look: Look): Promise<Record<string, Look>> {
  const all = await getLooks();
  all[id] = { ...all[id], ...look };
  if (kvConfigured()) await kvSetJSON(KEY, all);
  return all;
}
