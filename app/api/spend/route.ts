import { NextResponse } from "next/server";
import { rateLimit, currentUser } from "@/lib/security";
import { getSpend } from "@/lib/spendlog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/spend — auditoría de gasto de tokens (solo admin). Agrega por usuario y por acción.
export async function GET(req: Request) {
  const rl = rateLimit(req, "spend-get", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ ok: false, error: "Solo el admin ve la auditoría" }, { status: 403 });

  const entries = await getSpend();
  const dayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const weekStart = (() => { const d = new Date(); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); return d.getTime() - day * 86400_000; })();

  const sum = (arr: typeof entries) => arr.reduce((n, e) => n + (e.costUsd || 0), 0);
  const byUser: Record<string, { name: string; costUsd: number; count: number }> = {};
  const byAction: Record<string, number> = {};
  for (const e of entries) {
    byUser[e.user] = byUser[e.user] || { name: e.name || e.user, costUsd: 0, count: 0 };
    byUser[e.user].costUsd += e.costUsd || 0;
    byUser[e.user].count += 1;
    const cat = (e.action || "").split(":")[0] || "otro";
    byAction[cat] = (byAction[cat] || 0) + (e.costUsd || 0);
  }

  return NextResponse.json({
    ok: true,
    totals: {
      all: Number(sum(entries).toFixed(4)),
      today: Number(sum(entries.filter((e) => e.at >= dayStart)).toFixed(4)),
      week: Number(sum(entries.filter((e) => e.at >= weekStart)).toFixed(4)),
    },
    byUser: Object.entries(byUser).map(([id, v]) => ({ id, ...v, costUsd: Number(v.costUsd.toFixed(4)) })),
    byAction: Object.entries(byAction).map(([k, v]) => ({ action: k, costUsd: Number(v.toFixed(4)) })),
    recent: entries.slice(0, 40),
  });
}
