import { NextResponse } from "next/server";
import { makeToken, AUTH_COOKIE, COOKIE_OPTS } from "@/lib/auth";
import { rateLimit, readJsonLimited } from "@/lib/security";
import { findUserByCredentials, getUsers } from "@/lib/users";

export const runtime = "nodejs";

// POST /api/auth/login — verifica usuario/contraseña (admin, juan, david) y entrega cookie firmada.
export async function POST(req: Request) {
  // Anti fuerza bruta.
  const rl = rateLimit(req, "login", 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera un momento." }, { status: 429 });
  }

  const { data } = await readJsonLimited(req, 2_000);
  const user = String(data?.user ?? "").trim();
  const password = String(data?.password ?? "");

  if (getUsers().length === 0) {
    return NextResponse.json({ ok: false, error: "El login no está configurado en el servidor." }, { status: 500 });
  }

  const match = findUserByCredentials(user, password);
  if (!match) {
    return NextResponse.json({ ok: false, error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const token = await makeToken(match.id);
  const res = NextResponse.json({ ok: true, role: match.role, name: match.name });
  res.cookies.set(AUTH_COOKIE, token, COOKIE_OPTS);
  return res;
}
