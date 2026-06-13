/**
 * WhatsApp Business Cloud API (Meta).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Cumplimiento: solo plantillas (HSM) aprobadas fuera de la ventana de 24h,
 * opt-in obligatorio, y opt-out con palabra clave STOP.
 */
import { env, isLive } from "./config";

export interface WhatsAppSend {
  to: string; // E.164
  templateName?: string;
  bodyText?: string; // solo dentro de ventana de 24h
  variables?: string[];
}

export async function sendWhatsApp(
  msg: WhatsAppSend
): Promise<{ demo: boolean; id: string; note?: string }> {
  if (!isLive("whatsapp")) {
    return {
      demo: true,
      id: `wamid.DEMO.${Date.now()}`,
      note: "DEMO: mensaje simulado. Configura WHATSAPP_ACCESS_TOKEN + PHONE_NUMBER_ID.",
    };
  }

  const payload = msg.templateName
    ? {
        messaging_product: "whatsapp",
        to: msg.to,
        type: "template",
        template: {
          name: msg.templateName,
          language: { code: "es" },
          components: msg.variables
            ? [
                {
                  type: "body",
                  parameters: msg.variables.map((v) => ({ type: "text", text: v })),
                },
              ]
            : [],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: msg.to,
        type: "text",
        text: { body: msg.bodyText },
      };

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${env.whatsappPhoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) throw new Error(`WhatsApp error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { demo: false, id: data.messages?.[0]?.id ?? "unknown" };
}

/** Verifica el webhook (handshake de Meta). Úsalo en GET /api/webhooks/whatsapp. */
export function verifyWebhook(mode: string, token: string, challenge: string) {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  return mode === "subscribe" && token === expected ? challenge : null;
}

/**
 * Verifica la firma HMAC del webhook (header `x-hub-signature-256`) con el App Secret
 * de Meta. Evita procesar webhooks falsificados. Si WHATSAPP_APP_SECRET no está
 * configurado, devuelve true (modo dev) — configúralo en producción.
 */
export async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // dev: sin secreto no se exige
  if (!signature) return false;
  const crypto = await import("crypto");
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  // Comparación en tiempo constante
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
