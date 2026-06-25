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

// ── Parámetros anti-baneo (ajustables por env) — defaults CONSERVADORES ──
const MIN_DELAY = Number(process.env.WA_MIN_DELAY_MS || 6000);   // espera mínima antes de responder
const MAX_DELAY = Number(process.env.WA_MAX_DELAY_MS || 14000);  // + extra aleatorio
const PER_CHAR_MS = 40;                                          // "tiempo de tecleo" por carácter
const TYPING_MAX = 15000;                                        // tope de "escribiendo…"
const CONTACT_COOLDOWN = Number(process.env.WA_CONTACT_COOLDOWN_MS || 20000); // no repetir al mismo en 20s
const PER_MIN = Number(process.env.WA_PER_MIN || 4);            // máx 4 envíos por minuto
const PER_HOUR = Number(process.env.WA_PER_HOUR || 40);         // máx 40 por hora
const DAILY_CAP = Number(process.env.WA_DAILY_CAP || 80);       // máx 80 al día (cold = bajo)
// Pausa larga ocasional (parecer humano, no una máquina constante)
const LONG_PAUSE_EVERY = Number(process.env.WA_LONG_PAUSE_EVERY || 8); // cada ~8 envíos
const LONG_PAUSE_MS = Number(process.env.WA_LONG_PAUSE_MS || 45000);   // pausa ~45s

const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Límite de ritmo anti-baneo (módulo testeable; ver antiban.test.js).
const { createRateLimiter } = require("./antiban");
const limiter = createRateLimiter({ perMin: PER_MIN, perHour: PER_HOUR, dailyCap: DAILY_CAP, cooldownMs: CONTACT_COOLDOWN });
const canSend = (to) => limiter.canSend(to);
const markSent = (to) => limiter.record(to);

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

// Auto-reconexión ante caídas transitorias (red, recarga de WhatsApp Web).
// NO reintenta si fue LOGOUT (sesión cerrada a propósito → hay que reescanear QR).
let reconnects = 0;
client.on("disconnected", (reason) => {
  console.log("🔌 Desconectado:", reason);
  if (String(reason).toUpperCase().includes("LOGOUT")) {
    console.log("⚠️ Sesión cerrada (LOGOUT). Reinicia el conector y vuelve a escanear el QR.");
    return;
  }
  if (reconnects >= 5) { console.log("⛔ Demasiados intentos de reconexión. Reinicia el conector."); return; }
  reconnects++;
  const wait = Math.min(60000, 5000 * reconnects);
  console.log(`🔁 Reintentando conexión en ${Math.round(wait / 1000)}s (intento ${reconnects})…`);
  setTimeout(() => { client.initialize().catch((e) => console.error("reinit error:", e.message)); }, wait);
});
client.on("ready", () => { reconnects = 0; }); // conexión sana → resetea el contador

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

// ── Respuesta humana a RÁFAGAS ──
// Si llegan varios mensajes seguidos, NO respondemos a cada uno: guardamos todos al
// instante (para verlos en la app) y respondemos UNA sola vez tras una ventana de
// "silencio" (como una persona que lee todo y luego contesta). Con tope máximo.
const REPLY_QUIET_MS = Number(process.env.WA_REPLY_QUIET_MS || 9000);  // espera tras el último mensaje
const REPLY_MIN_MS = Number(process.env.WA_REPLY_MIN_MS || 3000);      // "tiempo de leer" mínimo
const REPLY_MAX_MS = Number(process.env.WA_REPLY_MAX_MS || 30000);     // tope aunque sigan llegando
const replyTimers = new Map(); // chatId -> { timer, firstAt }

function scheduleReply(chatId, from, name) {
  let st = replyTimers.get(chatId);
  if (!st) { st = { timer: null, firstAt: Date.now() }; replyTimers.set(chatId, st); }
  if (st.timer) clearTimeout(st.timer);
  const waited = Date.now() - st.firstAt;
  const wait = Math.max(REPLY_MIN_MS, Math.min(REPLY_QUIET_MS, REPLY_MAX_MS - waited));
  st.timer = setTimeout(() => doReply(chatId, from, name), wait);
}

async function doReply(chatId, from, name) {
  replyTimers.delete(chatId);
  try {
    const block = canSend(chatId);
    if (block) { console.log(`⏸️ ${from}: respuesta diferida (${block})`); return; }
    const r = await fetch(APP + "/api/whatsapp/incoming", { method: "POST", headers, body: JSON.stringify({ from, name, replyOnly: true }) });
    const j = await r.json().catch(() => ({}));
    if (j.ok && j.reply) { await humanSend(chatId, j.reply); console.log(`🤖 → ${from}: ${j.reply.slice(0, 60)}…`); }
    else console.log(`📥 ${from}: (${j.reason || "sin auto"})`);
  } catch (e) { console.error("reply error:", e.message); }
}

// Entrantes: guarda YA cada mensaje (sin responder) y agenda UNA respuesta humana.
client.on("message", async (msg) => {
  try {
    if (msg.fromMe) return;
    if (msg.from.endsWith("@g.us")) return;          // grupos no
    if (msg.from.includes("broadcast") || msg.isStatus) return; // estados/difusión no
    if (msg.type !== "chat" || !msg.body) return;     // solo texto
    const from = msg.from.replace("@c.us", "");
    let name;
    try { const c = await msg.getContact(); name = c.pushname || c.name || undefined; } catch {}
    // 1) guarda el mensaje al instante (visible en la app), SIN responder todavía
    await fetch(APP + "/api/whatsapp/incoming", { method: "POST", headers, body: JSON.stringify({ from, name, message: msg.body, reply: false }) }).catch(() => {});
    // 2) agenda una sola respuesta tras la ventana de silencio (lee toda la ráfaga)
    scheduleReply(msg.from, from, name);
  } catch (e) { console.error("incoming error:", e.message); }
});

// Salientes que TÚ escribiste en la app (respetan también los límites y el ritmo humano).
// BLINDAJE ANTI-DUPLICADOS (cada mensaje se envía EXACTAMENTE una vez):
//  1) `polling` evita que dos ciclos se solapen (humanSend tarda 4-12s > intervalo).
//  2) `doneIds` recuerda lo ya enviado por nosotros → jamás se reenvía aunque el server
//     no alcance a marcarlo.
//  3) se marca enviado de inmediato, mensaje por mensaje (no en lote).
let polling = false;
let sinceLongPause = 0;
const doneIds = new Set();
async function pollOutbox() {
  if (polling) return; // un solo ciclo a la vez
  polling = true;
  try {
    const r = await fetch(APP + "/api/whatsapp/outbox", { headers });
    const j = await r.json().catch(() => ({}));
    for (const m of (j.ok && j.messages) ? j.messages : []) {
      if (doneIds.has(m.msgId)) continue; // ya enviado por nosotros → NUNCA reenviar
      const to = m.to.includes("@") ? m.to : m.to + "@c.us";

      // Respeta los topes anti-baneo: si toca esperar, deja el resto en cola para el próximo ciclo.
      const block = canSend(to);
      if (block) { console.log(`⏳ cola en pausa anti-baneo: ${block}`); break; }

      // No enviar a números que NO tienen WhatsApp (un envío fallido es señal de spam).
      try {
        const reg = await client.isRegisteredUser(to).catch(() => true);
        if (!reg) {
          doneIds.add(m.msgId);
          await fetch(APP + "/api/whatsapp/outbox", { method: "POST", headers, body: JSON.stringify({ ids: [m.msgId] }) }).catch(() => {});
          console.log(`🚫 ${m.to} no tiene WhatsApp, omitido`);
          continue;
        }
      } catch {}

      try {
        await humanSend(to, m.text);
        doneIds.add(m.msgId);
        await fetch(APP + "/api/whatsapp/outbox", { method: "POST", headers, body: JSON.stringify({ ids: [m.msgId] }) }).catch(() => {});
        console.log(`👤 → ${m.to}: ${m.text.slice(0, 60)}…`);
        // Pausa larga ocasional: parecer humano, no una máquina constante.
        if (++sinceLongPause >= LONG_PAUSE_EVERY) { sinceLongPause = 0; console.log("😴 pausa larga anti-baneo…"); await sleep(LONG_PAUSE_MS); }
      } catch (e) { console.error("send error:", e.message); }
    }
  } catch { /* reintenta luego */ }
  finally { polling = false; }
}
setInterval(pollOutbox, 6000);

client.initialize();
