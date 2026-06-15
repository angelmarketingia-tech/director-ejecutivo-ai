import { NextResponse } from "next/server";
import { currentUser } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/me — identidad del usuario logueado (id, rol, nombre).
export async function GET(req: Request) {
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ ok: true, ...u });
}
