import { NextResponse } from "next/server";
import { rateLimit, currentUser } from "@/lib/security";
import { getLeadStates } from "@/lib/leadstore";
import { getSpend } from "@/lib/spendlog";
import { financeSummary } from "@/lib/billing";
import { getWaLog } from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/summary — resumen ejecutivo con KPIs (para el reporte "qué pasó mientras dormías").
 * Solo admin. ?range=day|week|all (por defecto day).
 */
export async function GET(req: Request) {
  const rl = rateLimit(req, "summary", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ ok: false, error: "Solo admin" }, { status: 403 });

  const range = new URL(req.url).searchParams.get("range") || "day";
  const now = Date.now();
  const since = range === "all" ? 0 : range === "week" ? now - 7 * 86400_000 : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();

  // Leads por etapa (del estado sincronizado)
  const states = Object.values(await getLeadStates());
  const byStage: Record<string, number> = {};
  for (const s of states) byStage[(s as any).stage || "prospected"] = (byStage[(s as any).stage || "prospected"] || 0) + 1;
  const count = (k: string[]) => states.filter((s) => k.includes((s as any).stage)).length;

  // Gasto IA (USD)
  const spend = await getSpend();
  const inRange = spend.filter((e) => e.at >= since);
  const iaUsd = inRange.reduce((n, e) => n + (e.costUsd || 0), 0);
  const byUser: Record<string, number> = {};
  for (const e of inRange) byUser[e.name || e.user] = (byUser[e.name || e.user] || 0) + (e.costUsd || 0);

  // Mensajes WhatsApp
  const log = await getWaLog();
  const msgs = log.filter((e) => e.at >= since);
  const autoMsgs = msgs.filter((e) => e.auto).length;

  // Finanzas
  const fin = await financeSummary();

  return NextResponse.json({
    ok: true,
    range,
    leads: {
      total: states.length,
      contactados: count(["contacted", "engaged", "meeting", "won"]),
      calificados: count(["qualified", "contacted", "engaged", "meeting", "won"]),
      ganados: count(["won"]),
      perdidos: count(["lost"]),
      byStage,
    },
    whatsapp: { total: msgs.length, automaticos: autoMsgs, manuales: msgs.length - autoMsgs },
    ia: { costoUsd: Number(iaUsd.toFixed(4)), porUsuario: Object.entries(byUser).map(([name, c]) => ({ name, usd: Number(c.toFixed(4)) })) },
    dinero: { cobrado: fin.paidTotal, porCobrar: fin.sentTotal, mrr: fin.mrr, cotizaciones: fin.quotesCount },
  });
}
