import { NextResponse } from "next/server";
import { verifyWebhook, verifySignature } from "@/lib/integrations/whatsapp";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";

// GET — handshake de verificación de Meta.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = verifyWebhook(
    searchParams.get("hub.mode") ?? "",
    searchParams.get("hub.verify_token") ?? "",
    searchParams.get("hub.challenge") ?? ""
  );
  if (challenge) return new Response(challenge, { status: 200 });
  return new Response("forbidden", { status: 403 });
}

// POST — recibe mensajes/estados. Verifica la FIRMA HMAC para rechazar webhooks falsos.
export async function POST(req: Request) {
  const rl = rateLimit(req, "wa-webhook", 120, 60_000);
  if (!rl.ok) return new Response("rate limit", { status: 429 });

  const raw = await req.text();
  if (raw.length > 200_000) return new Response("too large", { status: 413 });

  const ok = await verifySignature(raw, req.headers.get("x-hub-signature-256"));
  if (!ok) return new Response("invalid signature", { status: 401 });

  // TODO: persistir mensaje, actualizar estado del lead, disparar seguimiento.
  return NextResponse.json({ ok: true });
}
