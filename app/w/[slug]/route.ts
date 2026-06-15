import { getSite } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /w/<slug> — sirve la demo web publicada (pública, sin login) para mostrarla al cliente.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const site = await getSite(params.slug);
  if (!site) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><div style="font-family:system-ui;text-align:center;padding:60px;color:#444">Demo no encontrada o expirada.</div>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
  return new Response(site.html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
