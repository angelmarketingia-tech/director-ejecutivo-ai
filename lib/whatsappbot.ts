/**
 * Generador de respuestas del asistente de WhatsApp. Usa Claude (rápido/económico) con
 * la base de conocimiento del negocio. No inventa: responde solo con la KB.
 */
import { runRaw } from "@/lib/agents/claude";
import { getKB, buildBotSystem, type KnowledgeBase } from "@/lib/knowledge";

const REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { reply: { type: "string" } },
  required: ["reply"],
} as const;

export async function generateReply(
  userMessage: string,
  opts?: { kb?: KnowledgeBase; history?: { role: "cliente" | "negocio"; text: string }[] }
): Promise<string> {
  const kb = opts?.kb ?? (await getKB());
  const history = opts?.history?.length
    ? `Conversación previa:\n${opts.history.map((h) => `${h.role}: ${h.text}`).join("\n")}\n\n`
    : "";
  const res = await runRaw<{ reply: string }>({
    system: buildBotSystem(kb),
    model: "claude-haiku-4-5",
    input: `${history}Mensaje del cliente: ${userMessage}\n\nResponde como ${kb.businessName} por WhatsApp (breve y útil).`,
    schema: REPLY_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 800,
  });
  return res.data.reply;
}
