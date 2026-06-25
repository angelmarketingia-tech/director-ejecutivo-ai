import { NextResponse } from "next/server";
import { currentUser } from "@/lib/security";
import { env } from "@/lib/integrations/config";
import { kvConfigured } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — salud del sistema para monitoreo.
 * Público: { ok, status }. Solo admin ve qué integraciones están configuradas
 * (booleanos, NUNCA los valores de los secretos).
 */
export async function GET(req: Request) {
  const base = { ok: true, status: "healthy", time: new Date().toISOString() };
  const u = await currentUser(req).catch(() => null);
  if (u?.role !== "admin") return NextResponse.json(base);

  return NextResponse.json({
    ...base,
    integrations: {
      anthropic: !!env.anthropicKey,
      kv: kvConfigured(),
      higgsfield: !!(process.env.HIGGSFIELD_CREDENTIALS || (process.env.HIGGSFIELD_KEY_ID && process.env.HIGGSFIELD_KEY_SECRET)),
      pexels: !!env.pexelsKey,
      unsplash: !!env.unsplashKey,
      resend: !!(env.resendKey && env.emailFrom),
      whatsappConnector: !!process.env.API_SHARED_SECRET,
    },
  });
}
