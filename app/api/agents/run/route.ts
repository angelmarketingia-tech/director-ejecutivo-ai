import { NextResponse } from "next/server";
import {
  prospect,
  research,
  score,
  writeEmail,
  planCall,
  direct,
} from "@/lib/agents/workers";
import { BudgetExceededError, getBudget } from "@/lib/agents/budget";
import { rateLimit, readJsonLimited, authorized } from "@/lib/security";
import { withSpend } from "@/lib/spendlog";

export const runtime = "nodejs";
// 60s = plan Hobby de Vercel. En Pro súbelo a 300 para corridas largas de Fable 5.
export const maxDuration = 60;

const AGENTS = ["prospect", "research", "scoring", "email", "voice", "director"] as const;
type Body = {
  agent: (typeof AGENTS)[number];
  payload: any;
};

/**
 * POST /api/agents/run
 * Ejecuta un worker de agente real (Claude). Requiere ANTHROPIC_API_KEY.
 * Si falta la clave, devuelve 503 con instrucciones (el caller puede caer a demo).
 *
 * Ejemplo:
 *   curl -X POST /api/agents/run -d '{"agent":"research","payload":{"company":"La Trattoria","category":"Restaurante","city":"Quito","hasWebsite":false}}'
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, "agents-run", 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!(await authorized(req))) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { data, tooLarge, bad } = await readJsonLimited(req, 16_000);
  if (tooLarge) return NextResponse.json({ ok: false, error: "Payload demasiado grande" }, { status: 413 });
  if (bad) return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });

  const body = data as Body;
  if (!body?.agent || !AGENTS.includes(body.agent)) {
    return NextResponse.json({ ok: false, error: "Campo 'agent' inválido" }, { status: 400 });
  }

  try {
    const result = await withSpend(req, `agente:${body.agent}`, async () => {
      switch (body.agent) {
        case "prospect": return await prospect(body.payload);
        case "research": return await research(body.payload);
        case "scoring": return await score(body.payload);
        case "email": return await writeEmail(body.payload);
        case "voice": return await planCall(body.payload);
        case "director": return await direct(body.payload);
        default: throw new Error("__UNKNOWN_AGENT__");
      }
    });
    return NextResponse.json({ ok: true, budget: getBudget(), ...result });
  } catch (err: any) {
    // Casos esperados (sin clave / presupuesto): HTTP 200 con bandera (consola limpia).
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ ok: false, budgetExceeded: true, error: err.message, budget: getBudget() });
    }
    const msg = String(err?.message ?? err);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({
        ok: false,
        noKey: true,
        error: msg,
        hint: "Configura ANTHROPIC_API_KEY en .env.local para activar agentes reales. La sala sigue funcionando en modo demo.",
      });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
