/**
 * Conversaciones de WhatsApp (vía conector WhatsApp Web, sin API de Meta).
 * Guardadas en KV para verlas en la app. El humano puede tomar el control de un chat
 * (apagar el bot) y responder; sus mensajes se encolan y el conector los envía.
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";

export interface WaMsg {
  id: string;
  dir: "in" | "out";
  by: "client" | "bot" | "human";
  text: string;
  at: number;
  status?: "queued" | "sent";
}
export interface WaChat {
  id: string; // teléfono / id de WhatsApp
  name?: string;
  botEnabled: boolean; // si false, el humano lleva el chat
  hot?: boolean; // señal de intención de compra → atender rápido
  messages: WaMsg[];
  lastAt: number;
}

/** Detecta señales de compra en un mensaje (lead caliente). */
export function isHotSignal(text: string): boolean {
  const t = (text || "").toLowerCase();
  return [
    "me interesa", "cómo pago", "como pago", "cuánto debo", "cuanto debo", "quiero la", "quiero una",
    "agendar", "agenda", "cuándo", "cuando empez", "lo quiero", "hagámoslo", "hagamoslo", "contratar",
    "el demo", "el mockup", "envíame", "enviame", "número de cuenta", "numero de cuenta", "transferencia",
  ].some((k) => t.includes(k));
}

const KEY = "wa:chats:v1";
const MAX_CHATS = 300;
const MAX_MSGS = 120;

let SEQ = 1;
function mid(): string { return `wm_${Date.now()}_${SEQ++}`; }

async function readAll(): Promise<WaChat[]> {
  if (!kvConfigured()) return [];
  return (await kvGetJSON<WaChat[]>(KEY)) ?? [];
}
async function writeAll(chats: WaChat[]): Promise<void> {
  if (kvConfigured()) await kvSetJSON(KEY, chats.slice(0, MAX_CHATS));
}
function touch(chat: WaChat) {
  chat.messages = chat.messages.slice(-MAX_MSGS);
  chat.lastAt = Date.now();
}

export async function getChats(): Promise<WaChat[]> {
  const chats = await readAll();
  return chats.sort((a, b) => b.lastAt - a.lastAt);
}

/** Un chat por id (para generar respuesta usando su historial). */
export async function getChat(id: string): Promise<WaChat | null> {
  const chats = await readAll();
  return chats.find((c) => c.id === id) ?? null;
}

function findOrCreate(chats: WaChat[], id: string, name?: string): WaChat {
  let c = chats.find((x) => x.id === id);
  if (!c) {
    c = { id, name, botEnabled: true, messages: [], lastAt: Date.now() };
    chats.unshift(c);
  } else if (name && !c.name) c.name = name;
  return c;
}

/** Mensaje entrante del cliente. Devuelve el chat (para decidir si el bot responde). */
export async function addInbound(id: string, name: string | undefined, text: string): Promise<WaChat> {
  const chats = await readAll();
  const c = findOrCreate(chats, id, name);
  c.messages.push({ id: mid(), dir: "in", by: "client", text, at: Date.now() });
  if (isHotSignal(text)) c.hot = true; // señal de compra → marcar caliente
  touch(c);
  await writeAll(chats);
  return c;
}

/** Sincroniza chats existentes de WhatsApp (al conectar) para verlos en la bandeja. */
export async function syncChats(items: { id: string; name?: string; text: string; fromMe?: boolean; at?: number }[]): Promise<void> {
  const chats = await readAll();
  for (const it of items) {
    if (!it.id) continue;
    const c = findOrCreate(chats, it.id, it.name);
    const last = c.messages[c.messages.length - 1];
    if (it.text && (!last || last.text !== it.text)) {
      c.messages.push({ id: mid(), dir: it.fromMe ? "out" : "in", by: it.fromMe ? "human" : "client", text: it.text, at: it.at || Date.now(), status: "sent" });
    }
    c.lastAt = it.at || c.lastAt;
    c.messages = c.messages.slice(-MAX_MSGS);
  }
  await writeAll(chats);
}

/** Respuesta del bot (ya enviada por el conector). */
export async function addBotReply(id: string, text: string): Promise<void> {
  const chats = await readAll();
  const c = findOrCreate(chats, id);
  c.messages.push({ id: mid(), dir: "out", by: "bot", text, at: Date.now(), status: "sent" });
  touch(c);
  await writeAll(chats);
}

/** El humano/IA encola un mensaje; el conector lo enviará UNA sola vez. */
export async function queueHuman(id: string, text: string): Promise<void> {
  const chats = await readAll();
  const c = findOrCreate(chats, id);
  // Dedupe: no encolar si ya hay un mensaje idéntico pendiente, o si ya se envió uno
  // idéntico en los últimos 10 min (evita doble-clic / reintentos → doble envío).
  const dup = c.messages.some(
    (m) => m.dir === "out" && m.text === text && (m.status === "queued" || Date.now() - m.at < 600_000)
  );
  if (dup) return;
  c.messages.push({ id: mid(), dir: "out", by: "human", text, at: Date.now(), status: "queued" });
  touch(c);
  await writeAll(chats);
}

/** Mensajes encolados pendientes de enviar (para el conector). */
export async function getOutbox(): Promise<{ chatId: string; msgId: string; to: string; text: string }[]> {
  const chats = await readAll();
  const out: { chatId: string; msgId: string; to: string; text: string }[] = [];
  for (const c of chats) for (const m of c.messages) if (m.dir === "out" && m.status === "queued") out.push({ chatId: c.id, msgId: m.id, to: c.id, text: m.text });
  return out;
}

/** Marca como enviados los mensajes que el conector ya despachó. */
export async function markSent(msgIds: string[]): Promise<void> {
  const set = new Set(msgIds);
  const chats = await readAll();
  for (const c of chats) for (const m of c.messages) if (set.has(m.id)) m.status = "sent";
  await writeAll(chats);
}

/** Activa/desactiva el bot para un chat (handoff humano). */
export async function setChatBot(id: string, on: boolean): Promise<void> {
  const chats = await readAll();
  const c = chats.find((x) => x.id === id);
  if (c) { c.botEnabled = on; if (!on) c.hot = false; await writeAll(chats); }
}
