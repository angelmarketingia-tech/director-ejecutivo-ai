/**
 * Acceso mínimo a Vercel KV (Upstash Redis) vía REST, sin dependencias.
 * Se activa solo si KV_REST_API_URL + KV_REST_API_TOKEN están configurados
 * (Vercel los inyecta al crear un KV en Storage). Si no, queda inactivo.
 */
const URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export function kvConfigured(): boolean {
  return !!(URL && TOKEN);
}

async function cmd(args: (string | number)[]): Promise<any> {
  const res = await fetch(URL as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(args),
    // KV es rápido; no cachear
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  const j = await res.json();
  return j.result;
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  if (!kvConfigured()) return null;
  const v = await cmd(["GET", key]);
  return v ? (JSON.parse(v as string) as T) : null;
}

export async function kvSetJSON(key: string, value: unknown): Promise<void> {
  if (!kvConfigured()) return;
  await cmd(["SET", key, JSON.stringify(value)]);
}
