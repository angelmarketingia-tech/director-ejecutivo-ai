/**
 * IS_DEMO: true salvo que NEXT_PUBLIC_DEMO_MODE sea "false".
 * - true  → datos de demostración + simulación (local/pruebas).
 * - false → OPERACIÓN REAL: arranca vacío, sin datos falsos ni simulación.
 *
 * Como es NEXT_PUBLIC_, el valor queda fijado en el bundle al construir (Vercel).
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
