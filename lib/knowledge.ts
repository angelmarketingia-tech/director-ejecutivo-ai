/**
 * Base de conocimiento del bot de WhatsApp. Editable desde la app y guardada en KV.
 * Con ella, el asistente responde a clientes SOLO con información real del negocio
 * (servicios, precios, FAQs, tono). Nada inventado.
 */
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/kv";

export interface FAQ { q: string; a: string; }

export interface KnowledgeBase {
  businessName: string;
  about: string;
  services: string;
  pricing: string;
  faqs: FAQ[];
  tone: string;
  optOutWord: string;
  autoReplyEnabled: boolean;
  extraNotes?: string; // recomendaciones / contexto extra (incluye texto de archivos cargados)
  updatedAt: number;
}

const KEY = "kb:v1";

export function defaultKB(): KnowledgeBase {
  return {
    businessName: "Daptux.IA",
    about:
      "Agencia de Villavicencio (Meta) que crea páginas web profesionales con IA para negocios locales (restaurantes, comercios, servicios). Entrega rápida (pocos días), diseño moderno, optimización para Google y botón de WhatsApp. Somos de aquí: tenemos oficina en el barrio El Buque, Villavicencio, y podemos hacer una reunión presencial sin costo. Atendemos toda Colombia.",
    services:
      "- Páginas web de una página (landing) y sitios completos\n- Menú/catálogo digital, galería de fotos, reservas y botón directo a WhatsApp\n- Optimización SEO local para aparecer en Google\n- Mantenimiento mensual (hosting, dominio y cambios)",
    pricing:
      "- Landing profesional: desde $800.000 COP\n- Sitio completo (varias secciones): $1.500.000 a $3.500.000 COP\n- Mantenimiento: desde $120.000 COP/mes\n- Diagnóstico digital y mockup de tu web: GRATIS, sin compromiso",
    faqs: [
      { q: "¿Cuánto tardan en entregar?", a: "Entre 3 y 10 días hábiles según el alcance." },
      { q: "¿Incluye dominio y hosting?", a: "Sí, te ayudamos con el dominio y el hosting; el mantenimiento mensual los cubre." },
      { q: "¿Hacen una muestra antes de pagar?", a: "Sí: te armamos una DEMO funcional de tu web GRATIS y sin compromiso para que la veas antes de decidir." },
      { q: "¿Cómo es el pago?", a: "Normalmente 50% para empezar y 50% al entregar. Aceptamos transferencia (Nequi/Bancolombia)." },
      { q: "¿Dónde están ubicados?", a: "En Villavicencio, barrio El Buque. Si prefieres, te recibimos en la oficina para mostrarte todo en persona." },
      { q: "¿Puedo verlos en persona?", a: "Claro, somos de Villavicencio. Podemos agendar una reunión presencial en nuestra oficina en El Buque, sin costo." },
    ],
    tone:
      "Cercano, profesional y llanero (Villavicencio). Español de Colombia, trato de 'tú'. Respuestas MUY breves (1 a 3 frases), tipo WhatsApp, sin sonar a robot ni a copia pegada. Genera curiosidad y siempre cierra con UNA micro-acción: ofrecer la DEMO funcional GRATIS, agendar una llamada corta, o invitar a la oficina en El Buque.",
    optOutWord: "BAJA",
    autoReplyEnabled: false,
    extraNotes: "",
    updatedAt: 0,
  };
}

export async function getKB(): Promise<KnowledgeBase> {
  if (!kvConfigured()) return defaultKB();
  const kb = await kvGetJSON<KnowledgeBase>(KEY);
  return kb ? { ...defaultKB(), ...kb } : defaultKB();
}

export async function saveKB(patch: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
  const cur = await getKB();
  const next: KnowledgeBase = { ...cur, ...patch, updatedAt: Date.now() };
  if (kvConfigured()) await kvSetJSON(KEY, next);
  return next;
}

/** System prompt del asistente a partir de la base de conocimiento. */
export function buildBotSystem(kb: KnowledgeBase): string {
  return [
    `Eres el asistente de ventas por WhatsApp de ${kb.businessName}. Atiendes a clientes potenciales.`,
    `\nSOBRE EL NEGOCIO:\n${kb.about}`,
    `\nSERVICIOS:\n${kb.services}`,
    `\nPRECIOS:\n${kb.pricing}`,
    `\nPREGUNTAS FRECUENTES:\n${kb.faqs.map((f) => `P: ${f.q}\nR: ${f.a}`).join("\n")}`,
    `\nTONO Y REGLAS:\n${kb.tone}`,
    kb.extraNotes?.trim() ? `\nCONTEXTO Y RECOMENDACIONES EXTRA (úsalo como fuente de verdad):\n${kb.extraNotes.slice(0, 60000)}` : "",
    `- Responde SOLO con la información de esta base. Si no sabes algo, dilo con honestidad y ofrece que un asesor humano lo contacte. NUNCA inventes precios ni datos.`,
    `- Mensajes cortos y útiles, formato WhatsApp.`,
    `- Si el cliente quiere agendar o hablar con un humano, confírmalo y pide su nombre y horario preferido.`,
    `\nOBJETIVO: CERRAR. En cada mensaje avanza la venta. Termina SIEMPRE con una micro-acción fácil`,
    `(ofrecer la DEMO funcional GRATIS, agendar una llamada corta, o invitar a la oficina en El Buque, Villavicencio).`,
    `\nGANCHO PRINCIPAL: ofrecer hacerle una DEMO funcional de su página TOTALMENTE GRATIS si nos autoriza`,
    `(solo necesitamos su OK y unos datos básicos). Es lo que más engancha: que vea algo real sin pagar nada.`,
    `\nVENTAJA LOCAL: somos de Villavicencio (oficina en El Buque). Úsalo para generar confianza y, si el cliente`,
    `duda o es un buen prospecto, ofrécele una reunión PRESENCIAL sin costo en la oficina. Trato cercano y llanero.`,
    `\nMANEJO DE OBJECIONES (rebate con valor, sin presionar):`,
    `- "Está caro" → recalca el retorno (más clientes que te encuentran en Google) y la oferta de mockup GRATIS para que vea el valor antes de pagar; menciona el plan más accesible.`,
    `- "Lo voy a pensar" → ofrece hacerle el mockup gratis YA para que decida viendo algo real, sin compromiso. "¿Te lo armo y lo ves?"`,
    `- "Ya tengo alguien / ya tengo página" → ofrece un diagnóstico gratis de su web actual y 2 mejoras concretas; compara sin desprestigiar.`,
    `- "No tengo tiempo" → recalca que es llave en mano (3-10 días) y que solo necesitas unos datos.`,
    `- "¿Cómo pago?" / señales de compra → es un lead CALIENTE: confirma con entusiasmo, explica el pago (50/50) y pide su nombre para coordinar; sugiere pasar con un asesor humano.`,
    `- Sé cálido y consultivo, nunca insistente. Una sola pregunta de cierre por mensaje.`,
  ].join("\n");
}

// ── Registro de conversaciones del bot (para que el admin vea qué contesta) ──
export interface WaLogEntry { at: number; from: string; inbound: string; outbound: string; auto: boolean; }
const LOG_KEY = "wa:log:v1";

export async function appendWaLog(e: WaLogEntry): Promise<void> {
  if (!kvConfigured()) return;
  const list = (await kvGetJSON<WaLogEntry[]>(LOG_KEY)) ?? [];
  list.unshift(e);
  await kvSetJSON(LOG_KEY, list.slice(0, 500));
}

export async function getWaLog(): Promise<WaLogEntry[]> {
  if (!kvConfigured()) return [];
  return (await kvGetJSON<WaLogEntry[]>(LOG_KEY)) ?? [];
}
