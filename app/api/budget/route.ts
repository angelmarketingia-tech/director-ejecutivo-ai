import { NextResponse } from "next/server";
import { getBudget } from "@/lib/agents/budget";
import { env } from "@/lib/integrations/config";
import { rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/budget — estado del presupuesto del servidor + si Claude está conectado.
// No expone secretos: solo un booleano de conexión y cifras de gasto.
export async function GET(req: Request) {
  const rl = rateLimit(req, "budget", 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({
    budget: getBudget(),
    claudeConnected: !!env.anthropicKey,
  });
}
