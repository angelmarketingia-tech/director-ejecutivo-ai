/**
 * Autenticación simple por usuario/contraseña con cookie firmada (HMAC).
 * Funciona en Edge (middleware) y Node (rutas) usando Web Crypto.
 *
 * Se ACTIVA solo si APP_PASSWORD está definida (en Vercel). Sin ella, la app queda
 * abierta (útil en local/demo y para que las pruebas no se bloqueen).
 */

export const AUTH_COOKIE = "nexus_auth";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días

function secret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.API_SHARED_SECRET ||
    "insecure-dev-secret-change-me"
  );
}

export function isAuthEnabled(): boolean {
  return !!process.env.APP_PASSWORD;
}

// ── base64url helpers (Edge + Node) ──
function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlFromStr(s: string): string {
  return b64urlFromBytes(new TextEncoder().encode(s));
}
function strFromB64url(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64urlFromBytes(new Uint8Array(sig));
}

/** Crea un token firmado para el usuario, con expiración. */
export async function makeToken(user: string): Promise<string> {
  const payload = `${user}|${Date.now() + MAX_AGE_SEC * 1000}`;
  const sig = await hmac(payload);
  return `${b64urlFromStr(payload)}.${sig}`;
}

/** Verifica firma y expiración del token. */
export async function verifyToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [p, sig] = token.split(".");
  if (!p || !sig) return false;
  let payload: string;
  try {
    payload = strFromB64url(p);
  } catch {
    return false;
  }
  const expected = await hmac(payload);
  if (sig.length !== expected.length || sig !== expected) return false;
  const exp = Number(payload.split("|")[1]);
  return Number.isFinite(exp) && Date.now() < exp;
}

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SEC,
};
