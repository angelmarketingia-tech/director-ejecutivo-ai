/**
 * Biblioteca CURADA de imágenes "hero" premium generadas con Higgsfield, organizadas por
 * rubro. Se generan por adelantado (la app desplegada NO puede llamar a Higgsfield en vivo:
 * Higgsfield es un MCP atado a la sesión de Claude, no una API con key del servidor). Aquí
 * referenciamos las URLs del CDN de Higgsfield (durables) para que el constructor de webs
 * inyecte un hero de alta calidad según el rubro del negocio. Para galería/variedad se usa
 * Pexels en vivo (ver images.ts).
 *
 * Para añadir más: generar con Higgsfield (marketing_studio_image, 16:9), copiar la URL del
 * resultado y agregarla al rubro correspondiente.
 */

export interface HeroImage {
  url: string;
  alt: string;
}

/** Heroes por rubro. La clave se compara contra el rubro del negocio (fuzzy, ver matcher). */
// Versión _min.webp: optimizada (~100 KB) para que el hero cargue rápido (carga <2s).
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3AlzAcxQcuD8gKpW7YGLvJlJg30";
const LIBRARY: Record<string, HeroImage[]> = {
  restaurante: [
    { url: `${CDN}/hf_20260616_183547_b96d5e12-4dc4-4e12-be98-c5d3e9c4b0c6_min.webp`, alt: "Restaurante de comida llanera a la brasa" },
  ],
  barberia: [
    { url: `${CDN}/hf_20260616_183558_4563d6fd-7113-450d-a02e-6a5232c56d62_min.webp`, alt: "Barbería moderna, corte de cabello profesional" },
  ],
  gimnasio: [
    { url: `${CDN}/hf_20260616_183608_bb977d00-b168-4146-a83e-48d53dacd9b4_min.webp`, alt: "Gimnasio moderno, entrenamiento con pesas" },
  ],
  belleza: [
    { url: `${CDN}/hf_20260616_183619_6e4054fa-2e79-4a22-a0cf-69c621251f38_min.webp`, alt: "Spa y salón de belleza, ambiente relajante" },
  ],
  salud: [
    { url: `${CDN}/hf_20260616_183629_d09041e6-e374-4188-ac4a-11c0b19c02e8_min.webp`, alt: "Clínica dental moderna y profesional" },
  ],
  cafeteria: [
    { url: `${CDN}/hf_20260616_183638_8eb6d1ac-e69e-4043-a198-b44e17de8d58_min.webp`, alt: "Cafetería acogedora, barista preparando café" },
  ],
};

/** Sinónimos → clave canónica del rubro. */
const ALIASES: Record<string, string> = {
  restaurante: "restaurante", restaurant: "restaurante", comida: "restaurante", asadero: "restaurante",
  parrilla: "restaurante", asados: "restaurante", llanero: "restaurante", pizzeria: "restaurante", comidas: "restaurante",
  barberia: "barberia", barber: "barberia", peluqueria: "barberia", peluquería: "barberia",
  gimnasio: "gimnasio", gym: "gimnasio", fitness: "gimnasio", crossfit: "gimnasio", entrenamiento: "gimnasio",
  belleza: "belleza", spa: "belleza", estetica: "belleza", estética: "belleza", salon: "belleza", salón: "belleza", uñas: "belleza", maquillaje: "belleza",
  salud: "salud", dental: "salud", odontologia: "salud", odontología: "salud", clinica: "salud", clínica: "salud", consultorio: "salud", medico: "salud", médico: "salud",
  cafeteria: "cafeteria", cafetería: "cafeteria", cafe: "cafeteria", café: "cafeteria", coffee: "cafeteria", reposteria: "cafeteria",
};

/** Devuelve el/los hero(es) Higgsfield para un rubro (o [] si no hay match). */
export function higgsfieldHeroFor(category: string | undefined | null): HeroImage[] {
  if (!category) return [];
  const norm = category.toLowerCase();
  // Busca cualquier alias contenido en el texto del rubro.
  for (const [word, key] of Object.entries(ALIASES)) {
    if (norm.includes(word) && LIBRARY[key]?.length) return LIBRARY[key];
  }
  return [];
}

/** true si hay al menos un hero curado disponible para el rubro. */
export function hasHiggsfieldHero(category: string | undefined | null): boolean {
  return higgsfieldHeroFor(category).length > 0;
}
