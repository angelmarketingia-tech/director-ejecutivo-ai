import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, currentUser, vstr } from "@/lib/security";
import { getKB, saveKB, getWaLog, type FAQ } from "@/lib/knowledge";
import { isLive } from "@/lib/integrations/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/knowledge — base de conocimiento + estado de la conexión de WhatsApp + log reciente.
export async function GET(req: Request) {
  const rl = rateLimit(req, "kb-get", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const kb = await getKB();
  const log = u.role === "admin" ? await getWaLog() : [];
  return NextResponse.json({ ok: true, kb, waLive: isLive("whatsapp"), log: log.slice(0, 40), role: u.role });
}

// POST /api/knowledge — guarda cambios (solo admin).
export async function POST(req: Request) {
  const rl = rateLimit(req, "kb-post", 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ ok: false, error: "Solo el admin edita la base de conocimiento" }, { status: 403 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 30_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const patch: any = {};
  const d = data as any;
  for (const k of ["businessName", "about", "services", "pricing", "tone", "optOutWord"]) {
    if (typeof d?.[k] === "string") patch[k] = vstr(d[k], 6000) ?? "";
  }
  if (typeof d?.extraNotes === "string") patch.extraNotes = d.extraNotes.slice(0, 12000);
  if (typeof d?.autoReplyEnabled === "boolean") patch.autoReplyEnabled = d.autoReplyEnabled;
  if (Array.isArray(d?.faqs)) {
    patch.faqs = d.faqs
      .map((f: any) => ({ q: vstr(f?.q, 300) ?? "", a: vstr(f?.a, 1500) ?? "" }))
      .filter((f: FAQ) => f.q && f.a)
      .slice(0, 40);
  }
  const kb = await saveKB(patch);
  return NextResponse.json({ ok: true, kb });
}
