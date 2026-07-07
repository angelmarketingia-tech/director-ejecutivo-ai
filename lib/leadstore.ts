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
const MAX = 2000;

export function leadStoreEnabled(): boolean {
  return kvConfigured();
}

export async function getStoredLeads(): Promise<StoredLead[]> {
  if (!kvConfigured()) return [];
  return (await kvGetJSON<StoredLead[]>(KEY)) ?? [];
}

/** Guarda leads nuevos, deduplicando por empresa+ciudad. Los NUEVOS van PRIMERO
 * (datos frescos + los más recientes se ven arriba y nunca se cortan por un tope). */
export async function saveLeads(items: StoredLead[]): Promise<number> {
  if (!kvConfigured() || !items?.length) return 0;
  const current = await getStoredLeads();
  const currentKeys = new Set(current.map(keyOf));
  const newKeys = new Set(items.map(keyOf));
  let added = 0;
  for (const k of newKeys) if (!currentKeys.has(k)) added++;
  // Nuevos primero (con datos frescos), luego los previos que no se repiten. Sin duplicados.
  const seen = new Set<string>();
  const merged: StoredLead[] = [];
  for (const l of [...items, ...current]) {
    const k = keyOf(l);
    if (!l.company || seen.has(k)) continue;
    seen.add(k);
    merged.push(l);
  }
  await kvSetJSON(KEY, merged.slice(0, MAX));
  return added;
}

function keyOf(l: StoredLead): string {
  return `${(l.company || "").toLowerCase().trim()}|${(l.city || "").toLowerCase().trim()}`;
}

/**
 * Estado REAL del avance de un lead (etapa, score, mensaje preparado, contacto…),
 * sincronizado entre dispositivos. Clave = empresa|ciudad (igual que los leads).
 * Esto es lo que TÚ marcas: nunca contiene datos fabricados por el sistema.
 */
export interface LeadState {
  key: string;
  stage?: string;
  score?: number;
  temperature?: string;
  consent?: string;
  needs?: string[];
  outreach?: unknown;
  research?: unknown;
  updatedAt: number;
}

const STATE_KEY = "leadState:v1";

export async function getLeadStates(): Promise<Record<string, LeadState>> {
  if (!kvConfigured()) return {};
  return (await kvGetJSON<Record<string, LeadState>>(STATE_KEY)) ?? {};
}

/** Upsert por clave: el más reciente gana. Devuelve cuántos estados quedaron guardados. */
export async function saveLeadStates(items: LeadState[]): Promise<number> {
  if (!kvConfigured() || !items?.length) return 0;
  const all = await getLeadStates();
  for (const st of items) {
    if (!st?.key) continue;
    const prev = all[st.key];
    // Conserva el más reciente (evita que un dispositivo viejo pise uno nuevo).
    if (!prev || (st.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) all[st.key] = st;
  }
  await kvSetJSON(STATE_KEY, all);
  return Object.keys(all).length;
}
