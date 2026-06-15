import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, currentUser, vstr } from "@/lib/security";
import { listSubs, addSub, setSubStatus, financeSummary, type Subscription } from "@/lib/billing";
import { getSpend } from "@/lib/spendlog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/subs — suscripciones + resumen financiero (incluye costo IA). Solo admin.
export async function GET(req: Request) {
  const rl = rateLimit(req, "subs-get", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ ok: false, error: "Solo admin" }, { status: 403 });
  const summary = await financeSummary();
  const iaCost = (await getSpend()).reduce((n, e) => n + (e.costUsd || 0), 0);
  return NextResponse.json({ ok: true, subs: await listSubs(), summary: { ...summary, iaCostUsd: Number(iaCost.toFixed(4)) } });
}

// POST /api/subs — add | status. Solo admin.
export async function POST(req: Request) {
  const rl = rateLimit(req, "subs-post", 40, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ ok: false, error: "Solo admin" }, { status: 403 });

  const { data, bad } = await readJsonLimited(req, 4_000);
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  const action = vstr((data as any)?.action, 20);

  if (action === "add") {
    const client = vstr((data as any)?.client, 120);
    const plan = vstr((data as any)?.plan, 80) ?? "Mantenimiento";
    const monthly = Math.max(0, Number((data as any)?.monthly) || 0);
    if (!client || !monthly) return NextResponse.json({ ok: false, error: "Faltan 'client' y 'monthly'" }, { status: 400 });
    await addSub({ client, plan, monthly });
  } else if (action === "status") {
    const id = vstr((data as any)?.id, 40);
    const status = vstr((data as any)?.status, 20) as Subscription["status"];
    if (!id || !status) return NextResponse.json({ ok: false, error: "Faltan 'id' y 'status'" }, { status: 400 });
    await setSubStatus(id, status);
  } else {
    return NextResponse.json({ ok: false, error: "Acción inválida" }, { status: 400 });
  }
  const summary = await financeSummary();
  return NextResponse.json({ ok: true, subs: await listSubs(), summary });
}
