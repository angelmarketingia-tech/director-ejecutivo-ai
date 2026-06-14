import { NextResponse } from "next/server";
import { searchBusinesses } from "@/lib/integrations/maps";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/leads/places — negocios REALES vía Google Places API (New).
 * Requiere GOOGLE_MAPS_API_KEY y NEXT_PUBLIC_DEMO_MODE=false. Sin clave lo dice (no inventa).
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "places", 10, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 4_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const niche = vstr(data?.niche, 120);
  const city = vstr(data?.city, 80);
  if (!niche || !city) return NextResponse.json({ ok: false, error: "Faltan 'niche' y 'city'" }, { status: 400 });
  const count = Math.min(Math.max(Number(data?.count) || 8, 1), 20);

  try {
    const r = await searchBusinesses(niche, { city, limit: count });
    if (r.demo) {
      // Honesto: sin clave real NO devolvemos datos inventados.
      return NextResponse.json({
        ok: false,
        noKey: true,
        error: "Falta GOOGLE_MAPS_API_KEY (y NEXT_PUBLIC_DEMO_MODE=false). No invento datos.",
      });
    }
    const leads = r.results.map((p) => ({
      company: p.name,
      category: p.category,
      city: p.city || city,
      website: p.website ?? null,
      hasWebsite: p.hasWebsite,
      socials: [] as string[],
      evidenceUrl: `https://www.google.com/maps/place/?q=place_id:${p.externalId}`,
      audienceNote: p.reviews != null ? `${p.reviews} reseñas · ${p.rating ?? "?"}★` : null,
      phone: p.phone ?? null,
      email: null,
    }));
    const note = leads.length === 0 ? "Google Places no devolvió resultados." : `${leads.length} negocios reales de Google Places (con teléfono/web).`;
    return NextResponse.json({ ok: true, leads, note });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo consultar Google Places" }, { status: 502 });
  }
}
