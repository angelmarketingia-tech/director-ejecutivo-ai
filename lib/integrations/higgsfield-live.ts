/**
 * Generación de imágenes EN VIVO con la API oficial de Higgsfield (cuenta Daptux).
 * Sin dependencias: cliente fetch propio siguiendo el SDK oficial @higgsfield/client v2
 *   - Auth:    Authorization: Key KEY_ID:KEY_SECRET
 *   - Crear:   POST {BASE}/flux-pro/kontext/max/text-to-image  body { aspect_ratio, prompt, safety_tolerance }
 *   - Estado:  GET  {BASE}/requests/{request_id}/status        → status + jobs[0].results.raw.url
 *
 * Credenciales en Vercel: HIGGSFIELD_CREDENTIALS="KEY_ID:KEY_SECRET"
 *   (o HIGGSFIELD_KEY_ID + HIGGSFIELD_KEY_SECRET). Si faltan, devuelve null y el
 *   constructor cae a la biblioteca curada / Pexels / CSS (nunca rompe ni inventa).
 */

const BASE = process.env.HIGGSFIELD_BASE_URL || "https://platform.higgsfield.ai";

function creds(): string {
  const joined = process.env.HIGGSFIELD_CREDENTIALS;
  if (joined && joined.includes(":")) return joined;
  const id = process.env.HIGGSFIELD_KEY_ID;
  const secret = process.env.HIGGSFIELD_KEY_SECRET;
  return id && secret ? `${id}:${secret}` : "";
}

/** true si la API de Higgsfield está configurada (cuenta Daptux). */
export function higgsfieldLiveEnabled(): boolean {
  return !!creds();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pickUrl(o: any): string | undefined {
  return (
    o?.jobs?.[0]?.results?.raw?.url ||
    o?.jobs?.[0]?.results?.min?.url ||
    o?.results?.raw?.url ||
    o?.images?.[0]?.url ||
    o?.image?.url ||
    o?.url
  );
}

export interface LiveImage {
  url: string;
  alt: string;
}

/**
 * Genera UNA imagen con Higgsfield y espera a que termine (con tope de tiempo para no
 * colgar la función serverless). Devuelve null ante cualquier problema (→ fallback).
 */
export async function generateImageLive(
  prompt: string,
  aspect: "16:9" | "9:16" | "1:1" = "16:9",
  timeoutMs = 100_000
): Promise<LiveImage | null> {
  const c = creds();
  if (!c) return null;
  const headers = { Authorization: `Key ${c}`, "content-type": "application/json" };
  try {
    const r = await fetch(`${BASE}/flux-pro/kontext/max/text-to-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({ aspect_ratio: aspect, prompt, safety_tolerance: 2 }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (!j) return null;

    // ¿Resultado inmediato?
    const immediate = pickUrl(j);
    if (immediate) return { url: immediate, alt: prompt.slice(0, 90) };

    const id = j.request_id || j.id || j.requestId;
    if (!id) return null;

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(2500);
      const s = await fetch(`${BASE}/requests/${id}/status`, { headers, cache: "no-store" });
      if (!s.ok) continue;
      const sj = await s.json().catch(() => null);
      if (!sj) continue;
      const st = String(sj.status || "").toLowerCase();
      if (st === "completed" || st === "succeeded" || st === "success") {
        const u = pickUrl(sj);
        return u ? { url: u, alt: prompt.slice(0, 90) } : null;
      }
      if (st === "failed" || st === "nsfw" || st === "error" || st === "canceled") return null;
    }
    return null; // tiempo agotado
  } catch {
    return null;
  }
}

/** Hero premium para una web de negocio (rubro + ciudad), generado en vivo. */
export async function generateBusinessHeroLive(business: {
  name?: string;
  category?: string;
  city?: string;
  description?: string;
}): Promise<LiveImage | null> {
  const subject =
    business.description?.trim() ||
    [business.category, business.name && `para ${business.name}`, business.city && `en ${business.city}`]
      .filter(Boolean)
      .join(" ");
  const prompt =
    `Premium wide cinematic website hero photograph for ${subject || "a modern local business"}. ` +
    `Inviting, professional, editorial commercial photography, warm natural light, shallow depth of field, ` +
    `ultra detailed, high quality, no text, no watermark, no logo.`;
  return generateImageLive(prompt, "16:9");
}
