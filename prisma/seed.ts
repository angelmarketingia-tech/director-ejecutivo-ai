/**
 * Seed mínimo: registra los 6 agentes y una campaña demo.
 * Ejecuta con `npm run db:seed` (requiere DATABASE_URL y `npm run db:push` antes).
 */
import { PrismaClient, AgentKind } from "@prisma/client";

const prisma = new PrismaClient();

const AGENTS: { kind: AgentKind; name: string }[] = [
  { kind: "DIRECTOR", name: "ATLAS" },
  { kind: "PROSPECT", name: "SCOUT" },
  { kind: "RESEARCH", name: "ORACLE" },
  { kind: "SCORING", name: "FORGE" },
  { kind: "EMAIL", name: "QUILL" },
  { kind: "VOICE", name: "ECHO" },
];

async function main() {
  for (const a of AGENTS) {
    await prisma.agent.upsert({
      where: { kind: a.kind },
      update: { name: a.name },
      create: { kind: a.kind, name: a.name },
    });
  }

  await prisma.campaign.create({
    data: {
      name: "Restaurantes sin web — Quito",
      niche: "Restaurantes y cafés sin sitio web",
      city: "Quito",
      service: "Sitio web + reservas online",
      status: "DRAFT",
    },
  });

  console.log("Seed completado: 6 agentes + 1 campaña demo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
