import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE, isAuthEnabled } from "@/lib/auth";

/**
 * Protege TODA la app con login si APP_PASSWORD está configurada.
 * Sin esa variable, no exige nada (local/demo/pruebas).
 */
export async function middleware(req: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const ok = await verifyToken(req.cookies.get(AUTH_COOKIE)?.value);
  if (ok) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api")) {
    return new NextResponse(JSON.stringify({ error: "No autorizado. Inicia sesión." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

// Protege todo excepto recursos internos, la página de login y las rutas de auth.
export const config = {
  matcher: ["/((?!_next|favicon.ico|login|api/auth).*)"],
};
