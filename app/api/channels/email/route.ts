import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/integrations/email";
import { DEMO_MODE } from "@/lib/integrations/config";
import {
  rateLimit,
  readJsonLimited,
  authorized,
  validEmail,
  recipientAllowed,
  vstr,
} from "@/lib/security";

export const runtime = "nodejs";

/**
 * POST /api/channels/email — envía un email REAL vía Resend solo si:
 *   (a) no estamos en modo demo,
 *   (b) la petición está autorizada (API_SHARED_SECRET), y
 *   (c) el dominio del destinatario está permitido (EMAIL_ALLOWED_DOMAINS, si se define).
 * En modo demo SIEMPRE simula (no envía nada). Esto evita un relay de email abierto.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "email", 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const { data, tooLarge, bad } = await readJsonLimited(req, 50_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const to = data?.to ?? "demo@example.com";
  const subject = vstr(data?.subject, 200) ?? "Prueba — Director Comercial AI";
  const html =
    vstr(data?.html, 20_000) ??
    `<p>Hola 👋</p><p>Email de prueba de Director Comercial AI.</p>
     <p style="color:#888;font-size:12px">Para baja responde STOP. <a href="#">Cancelar suscripción</a>.</p>`;

  if (!validEmail(to)) {
    return NextResponse.json({ ok: false, error: "Destinatario inválido" }, { status: 400 });
  }

  // Envío REAL: requiere autorización + dominio permitido. Demo: siempre simula.
  if (!DEMO_MODE) {
    if (!authorized(req)) {
      return NextResponse.json({ ok: false, error: "Envío real no autorizado (configura API_SHARED_SECRET)" }, { status: 401 });
    }
    if (!recipientAllowed(to)) {
      return NextResponse.json({ ok: false, error: "Dominio de destinatario no permitido" }, { status: 403 });
    }
  }

  try {
    const res = await sendEmail({ to, subject, html, unsubscribeUrl: "https://tudominio.com/unsubscribe" });
    return NextResponse.json({ ok: true, ...res });
  } catch {
    // No filtrar detalles internos
    return NextResponse.json({ ok: false, error: "No se pudo enviar el email" }, { status: 500 });
  }
}
