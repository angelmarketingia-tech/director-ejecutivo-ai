import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, currentUser, vstr } from "@/lib/security";
import { getLooks, saveLook } from "@/lib/appearance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/appearance — looks de todos (cualquier usuario logueado los ve).
export async function GET(req: Request) {
  const rl = rateLimit(req, "look-get", 90, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ ok: true, looks: await getLooks(), role: u.role });
}

// POST /api/appearance — personaliza un personaje (solo admin).
export async function POST(req: Request) {
  const rl = rateLimit(req, "look-post", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ ok: false, error: "Solo el admin personaliza" }, { status: 403 });

  const { data, bad } = await readJsonLimited(req, 6_000);
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  const id = vstr((data as any)?.id, 40);
  if (!id) return NextResponse.json({ ok: false, error: "Falta 'id'" }, { status: 400 });
  const look = (data as any)?.look ?? {};
  // saneo simple de campos
  const clean: any = {};
  for (const k of ["name", "skin", "hair", "style", "shirt", "acc", "hat"]) if (typeof look[k] === "string") clean[k] = look[k].slice(0, 40);
  const looks = await saveLook(id, clean);
  return NextResponse.json({ ok: true, looks });
}
