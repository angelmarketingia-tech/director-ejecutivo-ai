/**
 * Motor de avatares pixel — VISTA FRONTAL con detalle (cara, ojos que parpadean, cejas,
 * nariz, boca, gafas, barba, peinados, gorro y outfit). Reutilizado por la oficina y el
 * editor PRO. Todo dibujado con fillRect (crisp pixel-art).
 */
export interface Look {
  name?: string;
  skin?: string;
  hair?: string;
  style?: string;   // short long bald mohawk bun spiky afro ponytail undercut
  shirt?: string;   // color (vacío = color base del agente)
  acc?: string;     // none | glasses
  hat?: string;     // none | cap | beanie
  hatColor?: string;
  outfit?: string;  // shirt | hoodie | suit
  beard?: string;   // none | stubble | goatee | full
  headset?: string; // "1" usa headset, "0" no
  headsetColor?: string;
  earring?: string; // none | gold | silver
}

export const SKINS = ["#ffe0bd", "#f1c9a0", "#e8b98a", "#d49a6a", "#c68642", "#a86b3c", "#8d5524", "#5a3825"];
export const HAIRS = ["#2b2017", "#4a3526", "#6b4b2a", "#141414", "#caa14a", "#e8d28a", "#7a3b1f", "#23233a", "#9aa0ac", "#d6d6de", "#b5552e", "#7c3aed", "#e0457b", "#2563eb", "#16a34a"];
export const SHIRTS = ["#22D3EE", "#A78BFA", "#34D399", "#FB7185", "#FBBF24", "#E8C766", "#60A5FA", "#f472b6", "#94a3b8", "#e5e7eb", "#1f2937", "#fb923c", "#ef4444", "#10b981"];
export const STYLES = ["short", "long", "bald", "mohawk", "bun", "spiky", "afro", "ponytail", "undercut"];
export const ACCS = ["none", "glasses"];
export const HATS = ["none", "cap", "beanie"];
export const OUTFITS = ["shirt", "hoodie", "suit"];
export const BEARDS = ["none", "stubble", "goatee", "full"];
export const EARRINGS = ["none", "gold", "silver"];

export function hashId(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f)));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function resolveLook(id: string, p: Look = {}) {
  const h = hashId(id || "x");
  return {
    skin: p.skin || SKINS[h % SKINS.length],
    hair: p.hair || HAIRS[(h >> 3) % HAIRS.length],
    style: p.style || STYLES[(h >> 6) % 4],
    shirt: p.shirt as string | undefined,
    acc: p.acc || ((h % 5) === 0 ? "glasses" : "none"),
    hat: p.hat || "none",
    hatColor: p.hatColor as string | undefined,
    outfit: p.outfit || "shirt",
    beard: p.beard || ((h % 6) === 0 ? "full" : (h % 6) === 1 ? "goatee" : "none"),
    headset: p.headset ?? "1",
    headsetColor: p.headsetColor as string | undefined,
    earring: p.earring || "none",
  };
}

export function drawAvatar(
  g: CanvasRenderingContext2D,
  cx: number,
  py: number,
  look: ReturnType<typeof resolveLook>,
  baseColor: string,
  scale = 1,
  frame = 0,
  mood: "work" | "idle" | "happy" = "work"
) {
  const R = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(cx + x * scale), Math.round(py + y * scale), Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))); };
  const skin = look.skin, skinD = shade(skin, 0.82), hair = look.hair, hairD = shade(hair, 0.7);
  const shirt = look.shirt || baseColor, outfit = look.outfit, hatCol = look.hatColor || baseColor;
  const blink = frame > 0 && (frame % 230 < 8);

  // ── Torso / outfit ──
  if (outfit === "hoodie") { R(-15, 19, 30, 6, shirt); R(-5, 20, 10, 3, skinD); } // capucha
  R(-13, 23, 26, 14, shirt);                    // torso
  R(-13, 23, 26, 2, shade(shirt, 1.18));        // luz hombro
  if (outfit === "suit") {
    R(-13, 23, 26, 14, "#222a3b");
    R(-13, 23, 6, 14, "#2c3550"); R(7, 23, 6, 14, "#2c3550"); // solapas
    R(-3, 23, 6, 14, "#eef1f8");                 // camisa
    R(-1, 23, 2, 8, look.shirt || "#c0392b");    // corbata
  }
  if (outfit === "hoodie") { R(-2, 25, 1, 7, shade(shirt, 0.6)); R(1, 25, 1, 7, shade(shirt, 0.6)); } // cordones

  // ── Cuello ──
  R(-4, 19, 8, 4, skinD);

  // ── Cabeza ──
  R(-9, 2, 18, 17, skin);
  R(-9, 2, 18, 2, shade(skin, 1.08));           // frente con luz
  R(-10, 9, 2, 4, skin); R(8, 9, 2, 4, skin);   // orejas
  if (look.earring !== "none") R(9, 13, 2, 2, look.earring === "gold" ? "#E8C766" : "#cfd6e4"); // arete

  // ── Pelo (frontal) ──
  if (look.style !== "bald") {
    // flequillo/top
    if (look.style === "undercut") { R(-9, 0, 18, 4, hair); R(-9, 4, 2, 4, hair); R(7, 4, 2, 4, hair); }
    else { R(-10, -1, 20, 6, hair); R(-10, 0, 3, 9, hair); R(7, 0, 3, 9, hair); }
    if (look.style === "short") { R(-8, 4, 16, 2, hair); }
    if (look.style === "long") { R(-12, 0, 3, 22, hair); R(9, 0, 3, 22, hair); }
    if (look.style === "afro") { R(-12, -5, 24, 9, hair); R(-12, -2, 3, 12, hair); R(9, -2, 3, 12, hair); }
    if (look.style === "mohawk") { R(-2, -5, 4, 8, hair); R(-9, 2, 4, 3, skinD); R(5, 2, 4, 3, skinD); }
    if (look.style === "spiky") { R(-9, -3, 3, 4, hair); R(-4, -5, 3, 6, hair); R(1, -4, 3, 5, hair); R(6, -3, 3, 4, hair); }
    if (look.style === "bun") { R(-3, -5, 6, 5, hair); }
    if (look.style === "ponytail") { R(9, 2, 3, 14, hair); }
    R(-10, -1, 20, 2, hairD);                    // sombra superior del pelo
  }

  // ── Cara ──
  R(-6, 7, 3, 1, hairD); R(3, 7, 3, 1, hairD);   // cejas
  const closed = blink || mood === "idle";
  if (closed) { R(-6, 10, 3, 1, skinD); R(3, 10, 3, 1, skinD); }
  else {
    R(-6, 9, 3, 3, "#ffffff"); R(3, 9, 3, 3, "#ffffff"); // ojos
    R(-5, 10, 2, 2, "#26344d"); R(4, 10, 2, 2, "#26344d"); // pupilas
  }
  R(-1, 12, 2, 2, skinD);                         // nariz
  const mouthC = shade(skin, 0.55);
  if (mood === "happy") { R(-3, 15, 6, 1, mouthC); R(-4, 14, 1, 1, mouthC); R(3, 14, 1, 1, mouthC); } // sonrisa
  else if (mood === "idle") { R(-1, 15, 2, 2, mouthC); }                                              // boquita (dormido)
  else { R(-3, 15, 5, 1, mouthC); }                                                                   // neutral

  // ── Barba ──
  if (look.beard === "full") { R(-9, 13, 18, 6, hair); R(-9, 11, 2, 6, hair); R(7, 11, 2, 6, hair); R(-3, 15, 6, 1, shade(skin, 0.6)); }
  else if (look.beard === "goatee") { R(-3, 16, 6, 3, hair); }
  else if (look.beard === "stubble") { R(-7, 16, 14, 2, shade(hair, 0.5)); }

  // ── Gafas ──
  if (look.acc === "glasses") {
    R(-7, 9, 5, 4, "#11203a"); R(-6, 10, 3, 2, "#9fd0ff");
    R(2, 9, 5, 4, "#11203a"); R(3, 10, 3, 2, "#9fd0ff");
    R(-2, 10, 4, 1, "#11203a");
  }

  // ── Headset (con color) ──
  const hsCol = look.headsetColor || "#1b2a3d";
  if (look.headset !== "0" && look.hat === "none") {
    R(-11, -1, 22, 3, shade(hsCol, 0.85)); R(-12, 7, 4, 8, hsCol); R(8, 7, 4, 8, hsCol);
  } else if (look.headset !== "0") { R(-12, 7, 4, 8, hsCol); R(8, 7, 4, 8, hsCol); }

  // ── Gorro ──
  if (look.hat === "cap") { R(-10, -2, 20, 6, hatCol); R(-12, 3, 14, 2, shade(hatCol, 0.7)); }
  if (look.hat === "beanie") { R(-11, -4, 22, 9, hatCol); R(-11, 3, 22, 2, shade(hatCol, 0.6)); }

  // ── Zzz (inactivo) ──
  if (mood === "idle") {
    g.fillStyle = "#9fb2d6"; g.textAlign = "left";
    const t = (frame / 26) % 6;
    g.font = `${Math.round(7 * scale)}px ui-sans-serif`; g.fillText("z", Math.round(cx + (9 + t) * scale), Math.round(py + (-3 - t) * scale));
    g.font = `${Math.round(10 * scale)}px ui-sans-serif`; g.fillText("Z", Math.round(cx + (13 + t) * scale), Math.round(py + (-9 - t) * scale));
  }
}
