/**
 * Google Places (New) — descubrimiento de negocios para el agente SCOUT.
 * Docs: https://developers.google.com/maps/documentation/places/web-service
 *
 * Usa SOLO datos públicos que devuelve la API y respeta sus términos de uso
 * (no almacenar masivamente contenido fuera de lo permitido).
 */
import { env, isLive } from "./config";
import { generateLead } from "@/lib/demo/data";

export interface PlaceLead {
  name: string;
  category: string;
  city: string;
  country: string;
  address?: string;
  lat?: number;
  lng?: number;
  website?: string | null;
  hasWebsite: boolean;
  rating?: number;
  reviews?: number;
  externalId: string;
  source: "google_maps" | "demo";
}

export async function searchBusinesses(
  query: string,
  opts: { city?: string; limit?: number } = {}
): Promise<{ demo: boolean; results: PlaceLead[]; note?: string }> {
  if (!isLive("maps")) {
    const results: PlaceLead[] = Array.from({ length: opts.limit ?? 8 }, () => {
      const l = generateLead();
      return {
        name: l.company,
        category: l.category,
        city: opts.city ?? l.city,
        country: l.country,
        website: l.website,
        hasWebsite: l.hasWebsite,
        rating: l.rating,
        reviews: l.reviews,
        externalId: l.id,
        source: "demo",
      };
    });
    return { demo: true, results, note: "DEMO: negocios simulados. Configura GOOGLE_MAPS_API_KEY." };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.mapsKey as string,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.location,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.id",
    },
    body: JSON.stringify({ textQuery: `${query} ${opts.city ?? ""}`.trim() }),
  });

  if (!res.ok) throw new Error(`Places error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const results: PlaceLead[] = (data.places ?? []).map((p: any) => ({
    name: p.displayName?.text ?? "Sin nombre",
    category: p.primaryType ?? "negocio",
    city: opts.city ?? "",
    country: "",
    address: p.formattedAddress,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    website: p.websiteUri ?? null,
    hasWebsite: !!p.websiteUri,
    rating: p.rating,
    reviews: p.userRatingCount,
    externalId: p.id,
    source: "google_maps",
  }));
  return { demo: false, results };
}
