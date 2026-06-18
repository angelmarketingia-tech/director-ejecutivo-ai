/**
 * Conector WhatsApp Web ↔ Director Comercial AI — MODO SEGURO (anti-baneo).
 *
 * Reduce al máximo el riesgo de bloqueo comportándose como un humano:
 *  - Solo RESPONDE a quien te escribe (nunca envíos masivos/en frío).
 *  - Marca "visto", muestra "escribiendo…" y espera un tiempo realista antes de responder.
 *  - Límites: por contacto (cooldown), por minuto, por hora y tope diario.
 *  - Ignora grupos, estados/broadcast y mensajes sin texto.
 *
 * IMPORTANTE: es una conexión NO oficial (contra los Términos de WhatsApp). Esto MINIMIZA el
 * riesgo, no lo elimina. Úsalo con un número ya usado/calentado y sin spam.
 */
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const APP = process.env.APP_URL || "https://director-ejecutivo-ai.vercel.app";
const SECRET = process.env.API_SHARED_SECRET || "";
const headers = { "content-type": "application/json", ...(SECRET ? { "x-api-secret": SECRET } : {}) };

// ── Parámetros anti-baneo (ajustables por env) ──
const MIN_DELAY = Number(process.env.WA_MIN_DELAY_MS || 4000);   // espera mínima antes de responder
const MAX_DELAY = Number(process.env.WA_MAX_DELAY_MS || 9000);   // + extra aleatorio
const PER_CHAR_MS = 35;                                          // "tiempo de tecleo" por carácter
const TYPING_MAX = 12000;                                        // tope de "escribiendo…"
const CONTACT_COOLDOWN = Number(process.env.WA_CONTACT_COOLDOWN_MS || 6000);
const PER_MIN = Number(process.env.WA_PER_MIN || 8);
const PER_HOUR = Number(process.env.WA_PER_HOUR || 120);
const DAILY_CAP = Number(process.env.WA_DAILY_CAP || 300);

const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ventanas de conteo
let sentMin = [], sentHour = [], sentDay = [], dayStamp = new Date().getDate();
const lastByContact = new Map();
function prune() {
  const now = Date.now();
  sentMin = sentMin.filter((t) => now - t < 60_000);
  sentHour = sentHour.filter((t) => now - t < 3_600_000);
  if (new Date().getDate() !== dayStamp) { sentDay = []; dayStamp = new Date().getDate(); }
}
function canSend(to) {
  prune();
  const now = Date.now();
  if (sentDay.length >= DAILY_CAP) return "tope diario";
  if (sentHour.length >= PER_HOUR) return "tope por hora";
  if (sentMin.length >= PER_MIN) return "tope por minuto";
  if (now - (lastByContact.get(to) || 0) < CONTACT_COOLDOWN) return "cooldown del contacto";
  return null;
}
function markSent(to) { const t = Date.now(); sentMin.push(t); sentHour.push(t); sentDay.push(t); lastByContact.set(to, t); }

// Ids de mensajes que ENVIAMOS nosotros (bot/app) para no duplicarlos en message_create.
const selfSent = new Set();

/** Envía como humano: marca visto → "escribiendo…" → espera realista → envía. */
async function humanSend(chatId, text) {
  try {
    const chat = await client.getChatById(chatId);
    await chat.sendSeen().catch(() => {});
    await chat.sendStateTyping().catch(() => {});
    const delay = Math.min(TYPING_MAX, rand(MIN_DELAY, MAX_DELAY) + (text || "").length * PER_CHAR_MS);
    await sleep(delay);
    await chat.clearState().catch(() => {});
  } catch { await sleep(rand(MIN_DELAY, MAX_DELAY)); }
  const sent = await client.sendMessage(chatId, text);
  try { if (sent?.id?._serialized) selfSent.add(sent.id._serialized); } catch {}
  markSent(chatId);
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

client.on("qr", (qr) => { console.log("\n📲 Escanea con WhatsApp Business → Ajustes → Dispositivos vinculados:\n"); qrcode.generate(qr, { small: true }); });
client.on("authenticated", () => console.log("🔐 Autenticado."));
client.on("disconnected", (r) => console.log("🔌 Desconectado:", r));

// Sincroniza los chats existentes para verlos en la bandeja (como WhatsApp Web).
async function syncChats() {
  try {
    const chats = await client.getChats();
    const items = [];
    for (const ch of chats.filter((c) => !c.isGroup).slice(0, 30)) {
      const id = (ch.id?._serialized || "").replace("@c.us", "");
      if (!id) continue;
      const last = ch.lastMessage;
      items.push({ id, name: ch.name || undefined, text: (last && last.body) || "(conversación)", fromMe: !!(last && last.fromMe), at: last ? last.timestamp * 1000 : Date.now() });
    }
    if (items.length) { await fetch(APP + "/api/whatsapp/sync", { method: "POST", headers, body: JSON.stringify({ chats: items }) }); console.log("📒 Chats sincronizados:", items.length); }
  } catch (e) { console.error("sync error:", e.message); }
}
client.on("ready", async () => {
  console.log("✅ Conectado (modo seguro anti-baneo). Deja esta ventana abierta.");
  await syncChats();
  setInterval(syncChats, 12000); // sincroniza cada 12s (casi tiempo real)
});

// Mensajes que TÚ envías desde tu celular → reflejarlos en la app (tiempo real).
// Dedupe: si lo envió el bot/app (selfSent) se ignora para no duplicar.
client.on("message_create", async (msg) => {
  try {
    if (!msg.fromMe) return;                                  // solo lo que sale de tu número
    if (msg.id?._serialized && selfSent.has(msg.id._serialized)) return; // ya lo registró el bot/app
    if ((msg.to || "").endsWith("@g.us")) return;             // grupos no
    if (msg.type !== "chat" || !msg.body) return;             // solo texto
    const to = (msg.to || "").replace("@c.us", "");
    if (!to) return;
    await fetch(APP + "/api/whatsapp/sync", {
      method: "POST",
      headers,
      body: JSON.stringify({ chats: [{ id: to, text: msg.body, fromMe: true, at: (msg.timestamp ? msg.timestamp * 1000 : Date.now()) }] }),
    });
    console.log(`📤 (tú, desde el cel) → ${to}: ${msg.body.slice(0, 50)}`);
  } catch (e) { console.error("message_create error:", e.message); }
});

// Entrantes → app → (si bot activo) respuesta humana-realista
client.on("message", async (msg) => {
  try {
    if (msg.fromMe) return;
    if (msg.from.endsWith("@g.us")) return;          // grupos no
    if (msg.from.includes("broadcast") || msg.isStatus) return; // estados/difusión no
    if (msg.type !== "chat" || !msg.body) return;     // solo texto
    const from = msg.from.replace("@c.us", "");
    let name;
    try { const c = await msg.getContact(); name = c.pushname || c.name || undefined; } catch {}
    const r = await fetch(APP + "/api/whatsapp/incoming", { method: "POST", headers, body: JSON.stringify({ from, name, message: msg.body }) });
    const j = await r.json().catch(() => ({}));
    if (j.ok && j.reply) {
      const block = canSend(msg.from);
      if (block) { console.log(`⏸️ ${from}: respuesta diferida (${block})`); return; } // se atiende manual o luego
      await humanSend(msg.from, j.reply);
      console.log(`🤖 → ${from}: ${j.reply.slice(0, 60)}…`);
    } else {
      console.log(`📥 ${from}: ${msg.body.slice(0, 50)} (${j.reason || "sin auto"})`);
    }
  } catch (e) { console.error("incoming error:", e.message); }
});

// Salientes que TÚ escribiste en la app (respetan también los límites y el ritmo humano)
async function pollOutbox() {
  try {
    const r = await fetch(APP + "/api/whatsapp/outbox", { headers });
    const j = await r.json().catch(() => ({}));
    if (j.ok && j.messages && j.messages.length) {
      const sent = [];
      for (const m of j.messages) {
        const to = m.to.includes("@") ? m.to : m.to + "@c.us";
        try { await humanSend(to, m.text); sent.push(m.msgId); console.log(`👤 → ${m.to}: ${m.text.slice(0, 60)}…`); }
        catch (e) { console.error("send error:", e.message); }
      }
      if (sent.length) await fetch(APP + "/api/whatsapp/outbox", { method: "POST", headers, body: JSON.stringify({ ids: sent }) });
    }
  } catch { /* reintenta luego */ }
}
setInterval(pollOutbox, 5000);

client.initialize();
