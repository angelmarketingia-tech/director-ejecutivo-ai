/**
 * Twilio — telefonía para originar llamadas del agente ECHO.
 * Docs: https://www.twilio.com/docs/voice/api
 * El audio se genera con ElevenLabs (ver elevenlabs.ts) y se reproduce vía TwiML <Play>,
 * o mediante media streams para conversación en tiempo real.
 */
import { env, isLive } from "./config";

export async function placeCall(opts: {
  to: string;
  twimlUrl: string; // endpoint que devuelve TwiML con el audio/guion
}): Promise<{ demo: boolean; sid: string; note?: string }> {
  if (!isLive("twilio")) {
    return {
      demo: true,
      sid: `CA_DEMO_${Date.now()}`,
      note: "DEMO: llamada simulada. Configura TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER.",
    };
  }

  const body = new URLSearchParams({
    To: opts.to,
    From: env.twilioFrom as string,
    Url: opts.twimlUrl,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${env.twilioSid}:${env.twilioToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { demo: false, sid: data.sid };
}
