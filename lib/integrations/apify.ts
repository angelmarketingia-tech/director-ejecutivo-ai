/**
 * Integración con Apify — scraper de Google Maps (actor compass/crawler-google-places).
 * Trae negocios REALES con teléfono, web y (best-effort) email. Requiere APIFY_TOKEN.
 *
 * Nota: Apify scrapea Google Maps; revisa los términos de uso. Cobra por uso (créditos).
 */

export interface ApifyLead {
  company: string;
  category: string | null;
  city: string | null;
  website: string | null;
  hasWebsite: boolean;
  phone: string | null;
  email: string | null;
  socials: string[];
  evidenceUrl: string | null;
  audienceNote: string | null;
}

export async function searchPlacesApify(input: {
  niche: string;
  city: string;
  count?: number;
}): Promise<ApifyLead[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN no configurada");

  const count = Math.min(Math.max(input.count ?? 8, 1), 20);
  const body = {
    searchStringsArray: [input.niche],
    locationQuery: input.city,
    maxCrawledPlacesPerSearch: count,
    language: "es",
    scrapeContacts: true, // intenta extraer email/redes (puede costar más)
  };

  const url = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(
    token
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Apify error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const items: any[] = await res.json();

  return items.slice(0, count).map((p) => {
    const socials = [p.instagram, p.facebook, p.linkedin, p.twitter, p.youtube].filter(
      (x) => typeof x === "string"
    ) as string[];
    const email =
      (Array.isArray(p.emails) && p.emails[0]) ||
      (Array.isArray(p.contactDetails?.emails) && p.contactDetails.emails[0]) ||
      null;
    return {
      company: String(p.title ?? "").slice(0, 120),
      category: p.categoryName ? String(p.categoryName).slice(0, 80) : null,
      city: p.city ? String(p.city) : input.city,
      website: p.website ? String(p.website).slice(0, 300) : null,
      hasWebsite: !!p.website,
      phone: p.phone ? String(p.phone) : p.phoneUnformatted ? String(p.phoneUnformatted) : null,
      email: email ? String(email).slice(0, 200) : null,
      socials: socials.slice(0, 5),
      evidenceUrl: p.url ? String(p.url).slice(0, 400) : null,
      audienceNote:
        typeof p.reviewsCount === "number" ? `${p.reviewsCount} reseñas · ${p.totalScore ?? "?"}★` : null,
    } as ApifyLead;
  }).filter((l) => l.company);
}
