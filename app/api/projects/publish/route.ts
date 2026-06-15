import { NextResponse } from "next/server";
import { rateLimit, readJsonLimited, authorized, vstr } from "@/lib/security";
import { saveSite } from "@/lib/sites";

export const runtime = "nodejs";

/**
 * POST /api/projects/publish — publica un HTML como demo en un link público (/w/<slug>).
 * Devuelve la URL para enviarla al cliente por WhatsApp.
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "publish", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 120_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const name = vstr((data as any)?.name, 120) ?? "demo";
  const html = vstr((data as any)?.html, 100_000);
  if (!html) return NextResponse.json({ ok: false, error: "Falta 'html'" }, { status: 400 });

  const site = await saveSite(name, html);
  if (!site) {
    return NextResponse.json({ ok: false, error: "Falta KV (Upstash) para publicar enlaces públicos." });
  }
  const origin = new URL(req.url).origin;
  return NextResponse.json({ ok: true, slug: site.slug, url: `${origin}/w/${site.slug}` });
}
