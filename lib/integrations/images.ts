/**
 * Búsqueda de imágenes REALES por palabra clave, para que las landings no usen URLs
 * inventadas (que se rompen) sino fotos que SÍ cargan y son relevantes.
 *
 * Proveedores (en orden): Pexels (PEXELS_API_KEY) → Unsplash (UNSPLASH_ACCESS_KEY).
 * Ambos tienen plan gratuito. Si no hay ninguna clave, devuelve [] y el constructor
 * usa visuales por CSS (gradientes/SVG) en vez de fotos rotas.
 */
import { env } from "./config";

export interface FoundImage {
  url: string;
  alt: string;
  credit?: string;
}

export function imagesEnabled(): boolean {
  return !!(env.pexelsKey || env.unsplashKey);
}

async function fromPexels(query: string, count: number): Promise<FoundImage[]> {
  if (!env.pexelsKey) return [];
  const u = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
  const r = await fetch(u, { headers: { Authorization: env.pexelsKey }, cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.photos ?? []).map((p: any) => ({
    url: p.src?.large2x || p.src?.large || p.src?.original,
    alt: p.alt || query,
    credit: p.photographer,
  }));
}

async function fromUnsplash(query: string, count: number): Promise<FoundImage[]> {
  if (!env.unsplashKey) return [];
  const u = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
  const r = await fetch(u, { headers: { Authorization: `Client-ID ${env.unsplashKey}` }, cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results ?? []).map((p: any) => ({
    url: p.urls?.regular,
    alt: p.alt_description || query,
    credit: p.user?.name,
  }));
}

/** Busca `count` imágenes reales para una palabra clave. Vacío si no hay proveedor. */
export async function searchImages(query: string, count = 3): Promise<FoundImage[]> {
  try {
    const res = env.pexelsKey ? await fromPexels(query, count) : await fromUnsplash(query, count);
    return res.filter((i) => !!i.url).slice(0, count);
  } catch {
    return [];
  }
}

/** Busca imágenes para varias palabras clave (1-2 por término) y aplana el resultado. */
export async function searchImagesMulti(queries: string[], perQuery = 2): Promise<FoundImage[]> {
  const lists = await Promise.all(queries.slice(0, 6).map((q) => searchImages(q, perQuery)));
  const seen = new Set<string>();
  const out: FoundImage[] = [];
  for (const list of lists) {
    for (const img of list) {
      if (seen.has(img.url)) continue;
      seen.add(img.url);
      out.push(img);
    }
  }
  return out;
}
