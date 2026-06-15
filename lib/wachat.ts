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
  messages: WaMsg[];
  lastAt: number;
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
  touch(c);
  await writeAll(chats);
  return c;
}

/** Respuesta del bot (ya enviada por el conector). */
export async function addBotReply(id: string, text: string): Promise<void> {
  const chats = await readAll();
  const c = findOrCreate(chats, id);
  c.messages.push({ id: mid(), dir: "out", by: "bot", text, at: Date.now(), status: "sent" });
  touch(c);
  await writeAll(chats);
}

/** El humano encola un mensaje; el conector lo enviará. */
export async function queueHuman(id: string, text: string): Promise<void> {
  const chats = await readAll();
  const c = findOrCreate(chats, id);
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
  if (c) { c.botEnabled = on; await writeAll(chats); }
}
