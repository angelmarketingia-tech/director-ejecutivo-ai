import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";
import { generateReply } from "@/lib/whatsappbot";
import { withSpend } from "@/lib/spendlog";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";

export const runtime = "nodejs";

/**
 * POST /api/whatsapp/test — prueba el asistente con la base de conocimiento SIN tener
 * la API de WhatsApp conectada. Devuelve la respuesta que enviaría el bot.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "wa-test", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 4_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const message = vstr((data as any)?.message, 1000);
  if (!message) return NextResponse.json({ ok: false, error: "Falta 'message'" }, { status: 400 });

  try {
    const reply = await withSpend(req, "whatsapp:test", () => generateReply(message));
    return NextResponse.json({ ok: true, reply, budget: getBudget() });
  } catch (err: any) {
    if (err instanceof BudgetExceededError) return NextResponse.json({ ok: false, budgetExceeded: true, error: err.message });
    const msg = String(err?.message ?? err);
    if (msg.includes("ANTHROPIC_API_KEY")) return NextResponse.json({ ok: false, noKey: true, error: "Falta ANTHROPIC_API_KEY." });
    return NextResponse.json({ ok: false, error: "No se pudo generar la respuesta" }, { status: 500 });
  }
}
