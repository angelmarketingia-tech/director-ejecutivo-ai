/**
 * Conector WhatsApp Web ↔ Director Comercial AI.
 * - Se conecta a tu WhatsApp Business escaneando un QR (sin API de Meta).
 * - Cada mensaje entrante lo envía a la app; si el bot está activo, responde con IA+KB.
 * - Cada 4s revisa si TÚ respondiste desde la app (bandeja) y lo envía por WhatsApp.
 *
 * Uso:
 *   1) npm install
 *   2) define las variables (ver README) y: npm start
 *   3) escanea el QR con WhatsApp Business (Ajustes → Dispositivos vinculados).
 *
 * Debe quedar CORRIENDO (tu PC encendido) para que conteste.
 */
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const APP = process.env.APP_URL || "https://director-ejecutivo-ai.vercel.app";
const SECRET = process.env.API_SHARED_SECRET || "";

if (!SECRET) {
  console.warn("⚠️  Sin API_SHARED_SECRET. Si lo configuraste en Vercel, debes ponerlo aquí también.");
}

const headers = { "content-type": "application/json", ...(SECRET ? { "x-api-secret": SECRET } : {}) };

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

client.on("qr", (qr) => {
  console.log("\n📲 Escanea este QR con WhatsApp Business → Ajustes → Dispositivos vinculados → Vincular dispositivo:\n");
  qrcode.generate(qr, { small: true });
});
client.on("authenticated", () => console.log("🔐 Autenticado."));
client.on("ready", () => console.log("✅ Conectado a WhatsApp. El asistente está activo. Deja esta ventana abierta."));
client.on("disconnected", (r) => console.log("🔌 Desconectado:", r));

// Entrantes → app → (si bot activo) respuesta IA
client.on("message", async (msg) => {
  try {
    if (msg.fromMe) return;
    if (msg.from.endsWith("@g.us")) return; // ignora grupos
    if (!msg.body) return;
    const from = msg.from.replace("@c.us", "");
    let name;
    try { const c = await msg.getContact(); name = c.pushname || c.name || undefined; } catch {}
    const r = await fetch(APP + "/api/whatsapp/incoming", {
      method: "POST",
      headers,
      body: JSON.stringify({ from, name, message: msg.body }),
    });
    const j = await r.json().catch(() => ({}));
    if (j.ok && j.reply) {
      await client.sendMessage(msg.from, j.reply);
      console.log(`🤖 → ${from}: ${j.reply.slice(0, 60)}…`);
    } else {
      console.log(`📥 ${from}: ${msg.body.slice(0, 50)} (${j.reason || "sin respuesta auto"})`);
    }
  } catch (e) {
    console.error("incoming error:", e.message);
  }
});

// Salientes encolados por el humano en la app → enviar por WhatsApp
async function pollOutbox() {
  try {
    const r = await fetch(APP + "/api/whatsapp/outbox", { headers });
    const j = await r.json().catch(() => ({}));
    if (j.ok && j.messages && j.messages.length) {
      const sent = [];
      for (const m of j.messages) {
        const to = m.to.includes("@") ? m.to : m.to + "@c.us";
        try { await client.sendMessage(to, m.text); sent.push(m.msgId); console.log(`👤 → ${m.to}: ${m.text.slice(0, 60)}…`); }
        catch (e) { console.error("send error:", e.message); }
      }
      if (sent.length) await fetch(APP + "/api/whatsapp/outbox", { method: "POST", headers, body: JSON.stringify({ ids: sent }) });
    }
  } catch (e) { /* red intermitente: reintenta luego */ }
}
setInterval(pollOutbox, 4000);

client.initialize();
