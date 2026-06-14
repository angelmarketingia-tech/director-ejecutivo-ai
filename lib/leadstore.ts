/**
 * Almacén de leads en el servidor (Vercel KV) para que los leads aparezcan en TODOS
 * los dispositivos y sobrevivan recargas. Si KV no está configurado, es no-op
 * (la app sigue funcionando, pero los leads quedan solo en el navegador).
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";

export interface StoredLead {
  company: string;
  category: string | null;
  city: string | null;
  website: string | null;
  hasWebsite: boolean;
  socials: string[];
  evidenceUrl: string | null;
  audienceNote: string | null;
  phone?: string | null;
  email?: string | null;
}

const KEY = "leads:v1";
const MAX = 1000;

export function leadStoreEnabled(): boolean {
  return kvConfigured();
}

export async function getStoredLeads(): Promise<StoredLead[]> {
  if (!kvConfigured()) return [];
  return (await kvGetJSON<StoredLead[]>(KEY)) ?? [];
}

/** Guarda leads nuevos, deduplicando por empresa+ciudad. Los nuevos van primero. */
export async function saveLeads(items: StoredLead[]): Promise<number> {
  if (!kvConfigured() || !items?.length) return 0;
  const current = await getStoredLeads();
  const map = new Map<string, StoredLead>();
  // Primero los actuales, luego los nuevos (los nuevos sobrescriben con datos frescos)
  for (const l of current) map.set(keyOf(l), l);
  let added = 0;
  for (const l of items) {
    const k = keyOf(l);
    if (!map.has(k)) added++;
    map.set(k, l);
  }
  const merged = Array.from(map.values()).slice(0, MAX);
  await kvSetJSON(KEY, merged);
  return added;
}

function keyOf(l: StoredLead): string {
  return `${(l.company || "").toLowerCase().trim()}|${(l.city || "").toLowerCase().trim()}`;
}
