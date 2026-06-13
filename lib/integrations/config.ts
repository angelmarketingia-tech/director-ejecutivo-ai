/**
 * Configuración central de integraciones.
 * DEMO_MODE controla si se llaman APIs reales o se devuelven respuestas simuladas.
 * Por defecto, si falta la API key correspondiente, el cliente cae a modo simulado.
 */

export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE !== "false"; // demo por defecto

export const env = {
  elevenLabsKey: process.env.ELEVENLABS_API_KEY,
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
  twilioSid: process.env.TWILIO_ACCOUNT_SID,
  twilioToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFrom: process.env.TWILIO_FROM_NUMBER,
  whatsappToken: process.env.WHATSAPP_ACCESS_TOKEN,
  whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  resendKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  mapsKey: process.env.GOOGLE_MAPS_API_KEY,
  calendarId: process.env.GOOGLE_CALENDAR_ID,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
};

/** true si la integración tiene credenciales y NO estamos forzando demo. */
export function isLive(provider: keyof typeof PROVIDER_KEYS): boolean {
  if (DEMO_MODE) return false;
  return PROVIDER_KEYS[provider].every((k) => !!process.env[k]);
}

const PROVIDER_KEYS = {
  elevenlabs: ["ELEVENLABS_API_KEY"],
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
  whatsapp: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  resend: ["RESEND_API_KEY", "EMAIL_FROM"],
  maps: ["GOOGLE_MAPS_API_KEY"],
  calendar: ["GOOGLE_CALENDAR_ID"],
  anthropic: ["ANTHROPIC_API_KEY"],
} as const;

/** Límites diarios para control de costos (sobrescribibles por campaña). */
export const RATE_LIMITS = {
  emailsPerDay: Number(process.env.LIMIT_EMAILS_PER_DAY ?? 200),
  whatsappPerDay: Number(process.env.LIMIT_WHATSAPP_PER_DAY ?? 120),
  callsPerDay: Number(process.env.LIMIT_CALLS_PER_DAY ?? 60),
  maxApiSpendUsdPerDay: Number(process.env.LIMIT_API_SPEND_USD ?? 50),
};
