/**
 * IS_DEMO: por defecto FALSE (operación real). Solo es demo si
 * NEXT_PUBLIC_DEMO_MODE === "true" (lo usamos en los tests E2E).
 *
 * - false (defecto) → OPERACIÓN REAL: arranca vacío, sin datos falsos ni simulación.
 *                     Nunca se inventan llamadas, conversaciones ni cierres.
 * - true            → datos de demostración + simulación (pruebas locales / E2E).
 *
 * Como es NEXT_PUBLIC_, el valor queda fijado en el bundle al construir (Vercel).
 * Así, aunque no configures nada en Vercel, producción es REAL.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
