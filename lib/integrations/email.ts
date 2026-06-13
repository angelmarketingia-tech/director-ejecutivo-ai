/**
 * Email vía Resend. Docs: https://resend.com/docs
 * Cumplimiento: incluir siempre cabecera List-Unsubscribe / enlace de baja,
 * remitente verificado (SPF/DKIM/DMARC) y solo contactos con base legal.
 */
import { env, isLive } from "./config";

export interface EmailSend {
  to: string;
  subject: string;
  html: string;
  unsubscribeUrl: string;
}

export async function sendEmail(
  msg: EmailSend
): Promise<{ demo: boolean; id: string; note?: string }> {
  if (!isLive("resend")) {
    return {
      demo: true,
      id: `email_DEMO_${Date.now()}`,
      note: "DEMO: email simulado. Configura RESEND_API_KEY + EMAIL_FROM.",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      headers: {
        "List-Unsubscribe": `<${msg.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { demo: false, id: data.id };
}
