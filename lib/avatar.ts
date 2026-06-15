/**
 * Motor de avatares pixel reutilizable (oficina + editor). Dibuja un personaje (vista
 * trasera, en su puesto) totalmente personalizable. Lo usan PixelOffice y el editor PRO.
 */
export interface Look {
  name?: string;
  skin?: string;
  hair?: string;
  style?: string; // short | long | bald | mohawk | bun | spiky
  shirt?: string; // null/undefined → usa el color base del agente
  acc?: string;   // none | headset | glasses
  hat?: string;   // none | cap | beanie
}

export const SKINS = ["#f1c9a0", "#e8b98a", "#c68642", "#8d5524", "#ffd9b3", "#5a3825"];
export const HAIRS = ["#2b2017", "#6b4b2a", "#141414", "#caa14a", "#7a3b1f", "#23233a", "#9aa0ac", "#b5552e", "#7c3aed", "#e0457b"];
export const SHIRTS = ["#22D3EE", "#A78BFA", "#34D399", "#FB7185", "#FBBF24", "#E8C766", "#60A5FA", "#f472b6", "#94a3b8", "#e5e7eb", "#1f2937", "#fb923c"];
export const STYLES = ["short", "long", "bald", "mohawk", "bun", "spiky"];
export const ACCS = ["headset", "glasses", "none"];
export const HATS = ["none", "cap", "beanie"];

export function hashId(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

/** Rellena los valores faltantes con un look determinista según el id. */
export function resolveLook(id: string, p: Look = {}): Required<Omit<Look, "name" | "shirt">> & { shirt?: string } {
  const h = hashId(id || "x");
  return {
    skin: p.skin || SKINS[h % SKINS.length],
    hair: p.hair || HAIRS[(h >> 3) % HAIRS.length],
    style: p.style || STYLES[(h >> 6) % 3], // short/long/bald por defecto
    shirt: p.shirt,
    acc: p.acc || ((h % 4) === 0 ? "glasses" : "headset"),
    hat: p.hat || "none",
  };
}

/**
 * Dibuja el avatar (vista trasera). cx = centro X, py = Y superior de la cabeza.
 * Píxeles con fillRect (crisp). `frame` para micro-animación de balanceo.
 */
export function drawAvatar(
  g: CanvasRenderingContext2D,
  cx: number,
  py: number,
  look: Required<Omit<Look, "name" | "shirt">> & { shirt?: string },
  baseColor: string,
  scale = 1
) {
  const R = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(cx + x * scale), Math.round(py + y * scale), Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))); };
  const shirt = look.shirt || baseColor;

  // hombros / camisa
  R(-14, 17, 28, 16, shirt);
  R(-14, 17, 28, 2, "rgba(255,255,255,0.12)"); // borde de luz
  // nuca (piel)
  R(-11, 13, 22, 6, look.skin);

  // pelo por estilo (vista trasera)
  if (look.style !== "bald") {
    R(-11, 2, 22, 13, look.hair); // base de cabeza con pelo
    if (look.style === "long") { R(-13, 6, 4, 16, look.hair); R(9, 6, 4, 16, look.hair); }
    if (look.style === "mohawk") { R(-2, -3, 4, 6, look.hair); }
    if (look.style === "bun") { R(-3, -3, 6, 6, look.hair); }
    if (look.style === "spiky") { R(-9, -2, 3, 4, look.hair); R(-3, -3, 3, 5, look.hair); R(3, -2, 3, 4, look.hair); R(7, -2, 2, 3, look.hair); }
  } else {
    R(-11, 4, 22, 11, look.skin); // calvo
    R(-11, 11, 22, 4, look.hair); // pelo lateral bajo
  }

  // gorro
  if (look.hat === "cap") { R(-12, 0, 24, 6, baseColor); R(-12, 6, 8, 2, "#1b2430"); }
  if (look.hat === "beanie") { R(-12, -2, 24, 9, baseColor); R(-12, 5, 24, 2, "rgba(0,0,0,0.25)"); }

  // accesorio
  if (look.acc === "headset" && look.hat === "none") { R(-13, 5, 4, 11, "#15202f"); R(9, 5, 4, 11, "#15202f"); R(-12, 0, 24, 4, "#15202f"); }
  else if (look.acc === "headset") { R(-13, 6, 4, 10, "#15202f"); R(9, 6, 4, 10, "#15202f"); }
  if (look.acc === "glasses") { R(-10, 11, 8, 1, "#cfe0ff"); R(2, 11, 8, 1, "#cfe0ff"); }
}
