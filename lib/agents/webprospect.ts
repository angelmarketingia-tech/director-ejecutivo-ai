/**
 * Prospección REAL por búsqueda web (Claude Opus 4.8 + herramienta web_search).
 * Devuelve negocios que aparecen en resultados de búsqueda reales, cada uno con su
 * URL de evidencia. NO inventa datos: lo que no se puede verificar va como null.
 *
 * Requiere ANTHROPIC_API_KEY. La herramienta web_search corre del lado del servidor
 * de Anthropic y devuelve resultados con citas (datos reales, no alucinaciones).
 */
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/integrations/config";
import { canSpend, recordUsage, BudgetExceededError } from "@/lib/agents/budget";

export interface DiscoveredLead {
  company: string;
  category: string | null;
  city: string | null;
  website: string | null;
  hasWebsite: boolean;
  socials: string[];
  evidenceUrl: string | null;
  audienceNote: string | null; // solo si aparece en una fuente; nunca inventado
}

const SYSTEM = `
Eres un investigador de prospección comercial. Tu ÚNICA fuente de verdad es la
herramienta de búsqueda web: usa web_search para encontrar NEGOCIOS REALES.

REGLAS ESTRICTAS (anti-alucinación):
- SOLO incluye negocios que aparezcan en resultados de búsqueda REALES, con una URL de
  fuente verificable (evidenceUrl).
- NUNCA inventes nombres, sitios web, perfiles sociales, números de seguidores ni datos.
- Si no puedes verificar un campo, ponlo en null (o lista vacía). Mejor null que inventar.
- "hasWebsite" solo true si encontraste una URL de sitio web propio real del negocio.
- "audienceNote" solo si una fuente lo menciona explícitamente (ej. "12k seguidores en IG");
  si no, null. No estimes números.
- Si no encuentras negocios reales, devuelve un array vacío.

SALIDA: EXCLUSIVAMENTE un JSON array (sin texto antes ni después), con objetos:
{"company","category","city","website"(string|null),"hasWebsite"(bool),
 "socials"(string[] de URLs),"evidenceUrl"(string|null),"audienceNote"(string|null)}
`.trim();

function extractJsonArray(text: string): any[] {
  // Quita fences y aísla el primer array JSON.
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function discoverLeads(input: {
  niche: string;
  city: string;
  count?: number;
}): Promise<{ leads: DiscoveredLead[]; note: string }> {
  if (!env.anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY no configurada.");
  }
  if (!canSpend(0.05)) {
    throw new BudgetExceededError("Tope de gasto diario alcanzado.");
  }

  const client = new Anthropic({ apiKey: env.anthropicKey });
  const count = Math.min(Math.max(input.count ?? 8, 1), 15);

  const userMsg =
    `Busca hasta ${count} negocios reales del nicho "${input.niche}" en "${input.city}". ` +
    `Prioriza los que NO tienen sitio web (mejor oportunidad). Para cada uno valida si ` +
    `tiene web, busca sus perfiles sociales y registra la URL de evidencia. ` +
    `Devuelve solo el JSON array.`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMsg }];

  // Bucle para manejar pause_turn (la herramienta server-side puede pausar).
  let finalText = "";
  for (let i = 0; i < 4; i++) {
    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: SYSTEM,
      tools: [{ type: "web_search_20260209", name: "web_search" } as any],
      messages,
    });
    recordUsage("claude-opus-4-8", res.usage as any);

    finalText = res.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue; // reanuda el bucle server-side
    }
    break;
  }

  const raw = extractJsonArray(finalText);
  const leads: DiscoveredLead[] = raw.slice(0, count).map((r) => ({
    company: String(r?.company ?? "").slice(0, 120),
    category: r?.category ? String(r.category).slice(0, 80) : null,
    city: r?.city ? String(r.city).slice(0, 80) : input.city,
    website: r?.website ? String(r.website).slice(0, 300) : null,
    hasWebsite: !!r?.hasWebsite && !!r?.website,
    socials: Array.isArray(r?.socials) ? r.socials.slice(0, 5).map((s: any) => String(s).slice(0, 300)) : [],
    evidenceUrl: r?.evidenceUrl ? String(r.evidenceUrl).slice(0, 300) : null,
    audienceNote: r?.audienceNote ? String(r.audienceNote).slice(0, 200) : null,
  })).filter((l) => l.company);

  const note =
    leads.length === 0
      ? "No se hallaron negocios reales verificables para ese nicho/ciudad. Prueba con otros términos."
      : `${leads.length} negocios reales encontrados con fuente verificable.`;

  return { leads, note };
}
