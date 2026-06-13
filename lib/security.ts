/**
 * Utilidades de seguridad para las rutas API:
 *  - rate limiting por IP (en memoria, por instancia),
 *  - lectura de JSON con límite de tamaño,
 *  - validación de campos,
 *  - autorización opcional por secreto compartido (API_SHARED_SECRET),
 *  - allowlist de dominios de email.
 *
 * Para despliegues multi-instancia, respaldar el rate limit en Redis.
 */

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "local";
}

/** Devuelve {ok:false, retryAfter} si se excede el límite en la ventana. */
export function rateLimit(
  req: Request,
  name: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

/** Lee el body como JSON con un tope de bytes. tooLarge=true si excede. */
export async function readJsonLimited(
  req: Request,
  maxBytes = 16_000
): Promise<{ data: any; tooLarge: boolean; bad: boolean }> {
  const text = await req.text();
  if (text.length > maxBytes) return { data: null, tooLarge: true, bad: false };
  if (!text) return { data: {}, tooLarge: false, bad: false };
  try {
    return { data: JSON.parse(text), tooLarge: false, bad: false };
  } catch {
    return { data: null, tooLarge: false, bad: true };
  }
}

/**
 * Autorización opcional: si API_SHARED_SECRET está configurado, exige el header
 * `x-api-secret`. Si no está configurado, no se exige (uso local / en-app en demo).
 */
export function authorized(req: Request): boolean {
  const secret = process.env.API_SHARED_SECRET;
  if (!secret) return true;
  return req.headers.get("x-api-secret") === secret;
}

export function secretConfigured(): boolean {
  return !!process.env.API_SHARED_SECRET;
}

/** Valida string no vacío con tope de longitud. */
export function vstr(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max ? v : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
}

/** Comprueba que el dominio del email esté en EMAIL_ALLOWED_DOMAINS (si está definido). */
export function recipientAllowed(email: string): boolean {
  const list = process.env.EMAIL_ALLOWED_DOMAINS;
  if (!list) return true; // sin allowlist no se restringe por dominio
  const domain = email.split("@")[1]?.toLowerCase();
  return list
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .includes(domain ?? "");
}
