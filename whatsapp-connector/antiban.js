/**
 * Núcleo ANTI-BANEO del conector (puro y testeable). Controla el ritmo de envío:
 *  - tope por minuto / por hora / por día
 *  - cooldown por contacto (no martillar al mismo número)
 * Inyecta `now` para poder testearlo con un reloj controlado.
 */
function createRateLimiter(opts = {}) {
  const PER_MIN = opts.perMin ?? 4;
  const PER_HOUR = opts.perHour ?? 40;
  const DAILY_CAP = opts.dailyCap ?? 80;
  const COOLDOWN = opts.cooldownMs ?? 20000;
  const now = opts.now ?? (() => Date.now());

  let sentMin = [];
  let sentHour = [];
  let sentDay = [];
  let dayStamp = new Date(now()).getDate();
  const lastByContact = new Map();

  function prune() {
    const t = now();
    sentMin = sentMin.filter((x) => t - x < 60_000);
    sentHour = sentHour.filter((x) => t - x < 3_600_000);
    if (new Date(t).getDate() !== dayStamp) { sentDay = []; dayStamp = new Date(t).getDate(); }
  }

  /** Devuelve null si se puede enviar a `to`, o un string con el motivo del bloqueo. */
  function canSend(to) {
    prune();
    const t = now();
    if (sentDay.length >= DAILY_CAP) return "tope diario";
    if (sentHour.length >= PER_HOUR) return "tope por hora";
    if (sentMin.length >= PER_MIN) return "tope por minuto";
    const last = lastByContact.get(to);
    if (last !== undefined && t - last < COOLDOWN) return "cooldown del contacto"; // solo si ya le escribimos
    return null;
  }

  /** Registra un envío a `to` (cuenta para los topes y el cooldown). */
  function record(to) {
    const t = now();
    sentMin.push(t); sentHour.push(t); sentDay.push(t);
    lastByContact.set(to, t);
  }

  return { canSend, record };
}

module.exports = { createRateLimiter };
