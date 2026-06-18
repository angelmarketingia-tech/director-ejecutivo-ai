/**
 * Latido (heartbeat) del conector de WhatsApp Web. El conector golpea los endpoints
 * /api/whatsapp/outbox (cada ~5s), /incoming y /sync; ahí registramos "última vez visto".
 * Así la app sabe de verdad si el conector está VIVO (no depende de la API de Meta).
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";

const KEY = "wa:connector:lastSeen";

export async function touchConnector(): Promise<void> {
  if (kvConfigured()) await kvSetJSON(KEY, Date.now());
}

export async function connectorLastSeen(): Promise<number> {
  if (!kvConfigured()) return 0;
  return (await kvGetJSON<number>(KEY)) ?? 0;
}

/** true si el conector dio señales en los últimos `maxAgeMs` (por defecto 2 min). */
export async function connectorLive(maxAgeMs = 120_000): Promise<boolean> {
  const last = await connectorLastSeen();
  return last > 0 && Date.now() - last < maxAgeMs;
}
