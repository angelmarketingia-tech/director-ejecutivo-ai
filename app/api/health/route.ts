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

  // Saldo/uso de Apify (solo admin). Consulta el uso del mes vs el tope. No expone el token.
  let apifyUsage: unknown = null;
  const apifyToken = process.env.APIFY_TOKEN;
  if (apifyToken) {
    try {
      const r = await fetch(`https://api.apify.com/v2/users/me/limits?token=${encodeURIComponent(apifyToken)}`, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        const d = (j?.data ?? {}) as any;
        const used = d?.current?.monthlyUsageUsd ?? d?.monthlyUsageUsd ?? null;
        const limit = d?.limits?.maxMonthlyUsageUsd ?? d?.maxMonthlyUsageUsd ?? null;
        apifyUsage = {
          usedUsd: typeof used === "number" ? Number(used.toFixed(4)) : null,
          limitUsd: typeof limit === "number" ? limit : null,
          remainingUsd: typeof used === "number" && typeof limit === "number" ? Number(Math.max(0, limit - used).toFixed(4)) : null,
        };
      } else {
        apifyUsage = { error: `Apify HTTP ${r.status}` };
      }
    } catch {
      apifyUsage = { error: "no se pudo consultar Apify" };
    }
  }

  return NextResponse.json({
    ...base,
    apifyUsage, // saldo/uso de Apify del mes (USD)
    integrations: {
      anthropic: !!env.anthropicKey,
      kv: kvConfigured(),
      higgsfield: !!(process.env.HIGGSFIELD_CREDENTIALS || (process.env.HIGGSFIELD_KEY_ID && process.env.HIGGSFIELD_KEY_SECRET)),
      pexels: !!env.pexelsKey,
      unsplash: !!env.unsplashKey,
      resend: !!(env.resendKey && env.emailFrom),
      whatsappConnector: !!process.env.API_SHARED_SECRET,
      // Fuentes de leads:
      apify: !!process.env.APIFY_TOKEN,     // leads con teléfono + email (Google Maps scraper)
      googleMaps: !!env.mapsKey,            // Google Places (teléfono; normalmente sin email)
    },
  });
}
