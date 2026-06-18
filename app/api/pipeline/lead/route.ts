import { NextResponse } from "next/server";
import { research, score, writeEmail, writeWhatsAppOpener } from "@/lib/agents/workers";
import { sendEmail } from "@/lib/integrations/email";
import { queueHuman } from "@/lib/wachat";
import { isLive, DEMO_MODE } from "@/lib/integrations/config";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized, recipientAllowed } from "@/lib/security";
import { withSpend } from "@/lib/spendlog";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro

const SERVICE = "una página web profesional para conseguir más clientes";

// Firma real del vendedor (sobrescribible por variables de entorno en Vercel).
const SELLER = {
  name: process.env.SELLER_NAME || "Angel Vaca",
  business: process.env.SELLER_BUSINESS || "Daptux.IA",
  phone: process.env.SELLER_PHONE || "+57 323 229 5422",
};
const SIGNATURE = `${SELLER.name}\n${SELLER.business}\n${SELLER.phone}`;

/** Rellena los placeholders ({{contactName}}, {{company}}, {{city}}) con datos reales. */
function fillPlaceholders(text: string, lead: any): string {
  const first = (lead.contactName ?? "").split(" ")[0] ?? "";
  return (text || "")
    .replace(/\{\{\s*contactName\s*\}\}/gi, first)
    .replace(/\{\{\s*company\s*\}\}/gi, lead.company ?? "")
    .replace(/\{\{\s*city\s*\}\}/gi, lead.city ?? "")
    .replace(/\{\{\s*\w+\s*\}\}/g, "") // cualquier otro placeholder → vacío
    .replace(/Hola\s*,/g, "Hola,") // limpia "Hola ," cuando no hay nombre
    .trim();
}

/** Garantiza la firma real: reemplaza el bloque [corchetes] por los datos del vendedor. */
function applySignature(text: string): string {
  let b = text || "";
  // Reemplaza el primer bloque de líneas tipo "[Nombre del asesor]" por la firma real.
  b = b.replace(/(?:[ \t]*\[[^\]\n]*\][ \t]*\n?){1,6}/, SIGNATURE + "\n");
  // Limpia cualquier corchete suelto que haya quedado.
  b = b.replace(/\[[^\]\n]*\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  // Si el modelo no incluyó la firma, la añade al final.
  if (!b.includes(SELLER.business)) b += `\n\n${SIGNATURE}`;
  return b;
}

/**
 * POST /api/pipeline/lead — ejecuta el PIPELINE COMPLETO sobre UN lead con Claude real:
 *   ORACLE (investiga) → FORGE (califica) → QUILL (redacta el mensaje).
 * Si el lead tiene email y Resend está configurado, ENVÍA el email de verdad y lo marca
 * como contactado. Si no, deja el mensaje listo (para enviar por WhatsApp tú).
 * El cliente recorre los leads llamando a este endpoint (1 lead por llamada = sin timeouts
 * + barra de progreso). Nunca inventa datos: si falta la clave, lo dice.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "pipeline-lead", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 16_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const lead = (data as any)?.lead;
  if (!lead?.company) return NextResponse.json({ ok: false, error: "Falta 'lead'" }, { status: 400 });
  const doSend = (data as any)?.send !== false; // por defecto intenta enviar (email)
  const sendWhatsApp = (data as any)?.sendWhatsApp === true; // auto-envío del 1er WhatsApp (opt-in)
  const channel: "whatsapp" | "email" = lead.phone ? "whatsapp" : "email";

  try {
    // ORACLE investiga + FORGE califica + QUILL redacta (Claude real), gasto atribuido al usuario.
    const { researchData, scoring, email } = await withSpend(req, `pipeline:${lead.company}`, async () => {
      // Reutiliza la investigación previa si ya existe (no la repite).
      const r = lead.research?.hook ? { data: lead.research } : await research(lead);
      const sc = await score({ lead, research: r.data, service: SERVICE });
      // WhatsApp → opener corto de alto cierre (pide OK para demo gratis). Email → mensaje formal.
      if (channel === "whatsapp") {
        const op = await writeWhatsAppOpener({ lead, research: r.data });
        return {
          researchData: r.data,
          scoring: sc.data,
          email: { subject: undefined as string | undefined, body: fillPlaceholders(op.data.message, lead) },
        };
      }
      const em = await writeEmail({ lead, research: r.data, service: SERVICE, seller: SELLER });
      return {
        researchData: r.data,
        scoring: sc.data,
        email: {
          subject: fillPlaceholders(em.data.subject, lead).replace(/[,;]\s*$/, ""),
          body: applySignature(fillPlaceholders(em.data.body, lead)),
        },
      };
    });

    let sent = false;
    let sendNote: string | undefined;

    // 4a) Auto-envío del PRIMER WhatsApp vía el conector (ritmo humano anti-baneo).
    //     Opt-in (sendWhatsApp). El conector lo recoge del outbox y lo manda.
    if (sendWhatsApp && channel === "whatsapp" && lead.phone) {
      const digits = lead.phone.replace(/[^\d]/g, "");
      if (digits.length >= 10) {
        try {
          await queueHuman(digits, email.body);
          sent = true;
          sendNote = "Mensaje encolado: el conector lo enviará por WhatsApp con ritmo humano (anti-baneo). El bot seguirá la conversación.";
        } catch {
          sendNote = "No se pudo encolar el WhatsApp (revisa KV/conector).";
        }
      } else {
        sendNote = "Teléfono inválido para WhatsApp.";
      }
    }

    // 4b) Contacto REAL por email: solo si hay dirección + Resend configurado + dominio permitido.
    if (!sent && doSend && lead.email && !DEMO_MODE && isLive("resend") && recipientAllowed(lead.email)) {
      try {
        const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">${
          email.body.replace(/\n/g, "<br>")
        }<hr style="border:none;border-top:1px solid #eee;margin:16px 0"><p style="color:#888;font-size:12px">Si no deseas recibir más mensajes, responde BAJA.</p></div>`;
        const res = await sendEmail({
          to: lead.email,
          subject: email.subject || lead.company,
          html,
          unsubscribeUrl: "https://director-ejecutivo-ai.vercel.app/unsubscribe",
        });
        sent = !res.demo;
      } catch {
        sendNote = "No se pudo enviar el email (revisa Resend).";
      }
    } else if (!sent && doSend && lead.email && !isLive("resend")) {
      sendNote = "Email listo. Configura RESEND_API_KEY + EMAIL_FROM para envío automático.";
    } else if (!sent && !lead.email && channel === "email") {
      sendNote = "Sin email ni teléfono: usa los botones del lead para contactar.";
    } else if (!sent && channel === "whatsapp") {
      sendNote = "Mensaje de WhatsApp listo. Pulsa “Abrir WhatsApp” o activa el envío automático.";
    }

    return NextResponse.json({
      ok: true,
      budget: getBudget(),
      research: researchData,
      scoring,
      message: { subject: email.subject, body: email.body },
      sent,
      sendNote,
    });
  } catch (err: any) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ ok: false, budgetExceeded: true, error: err.message, budget: getBudget() });
    }
    const msg = String(err?.message ?? err);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({
        ok: false,
        noKey: true,
        error: "Sin ANTHROPIC_API_KEY no puedo ejecutar el pipeline con IA. No invento datos.",
      });
    }
    return NextResponse.json({ ok: false, error: "No se pudo ejecutar el pipeline en este lead" }, { status: 500 });
  }
}
