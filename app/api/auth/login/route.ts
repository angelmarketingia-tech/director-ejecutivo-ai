import { NextResponse } from "next/server";
import { makeToken, AUTH_COOKIE, COOKIE_OPTS } from "@/lib/auth";
import { rateLimit, readJsonLimited } from "@/lib/security";

export const runtime = "nodejs";

// POST /api/auth/login — verifica usuario/contraseña y entrega cookie firmada.
export async function POST(req: Request) {
  // Anti fuerza bruta.
  const rl = rateLimit(req, "login", 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera un momento." }, { status: 429 });
  }

  const { data } = await readJsonLimited(req, 2_000);
  const user = String(data?.user ?? "").trim();
  const password = String(data?.password ?? "");

  const U = process.env.APP_USER || "admin";
  const P = process.env.APP_PASSWORD || "";

  if (!P) {
    return NextResponse.json({ ok: false, error: "El login no está configurado en el servidor." }, { status: 500 });
  }
  if (user !== U || password !== P) {
    return NextResponse.json({ ok: false, error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const token = await makeToken(user);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, COOKIE_OPTS);
  return res;
}
