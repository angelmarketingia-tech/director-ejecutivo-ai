import { test, expect } from "@playwright/test";

/**
 * E2E de SEGURIDAD: valida el blindaje de las rutas API (validación, tamaño, rate
 * limit) y las cabeceras de seguridad. Usa la API directamente (request).
 */

test("SEG · cabeceras de seguridad presentes en la página", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["referrer-policy"]).toBeTruthy();
  expect(h["x-powered-by"]).toBeFalsy(); // no revelar el framework
});

test("SEG · /api/agents/task rechaza JSON inválido y campos faltantes", async ({ request }) => {
  const bad = await request.post("/api/agents/task", { headers: { "content-type": "application/json" }, data: "no-json" as any });
  expect(bad.status()).toBe(400);

  const missing = await request.post("/api/agents/task", { data: { area: "Marketing" } });
  expect(missing.status()).toBe(400);
});

test("SEG · /api/agents/task rechaza payload gigante (413)", async ({ request }) => {
  const huge = "x".repeat(200_000);
  const res = await request.post("/api/agents/task", { data: { name: "PRISM", task: huge } });
  expect(res.status()).toBe(413);
});

test("SEG · /api/agents/run valida el agente", async ({ request }) => {
  const res = await request.post("/api/agents/run", { data: { agent: "hacker", payload: {} } });
  expect(res.status()).toBe(400);
});

test("SEG · /api/channels/email rechaza destinatario inválido", async ({ request }) => {
  const res = await request.post("/api/channels/email", { data: { to: "no-es-email" } });
  expect(res.status()).toBe(400);
});

test("SEG · rate limit activo (ráfaga en /api/leads → 429)", async ({ request }) => {
  // /api/leads no lo usan otras pruebas: la ráfaga no interfiere con flujos funcionales.
  let got429 = false;
  for (let i = 0; i < 75; i++) {
    const r = await request.get("/api/leads");
    if (r.status() === 429) {
      got429 = true;
      break;
    }
  }
  expect(got429).toBe(true);
});

test("SEG · webhook WhatsApp GET sin token correcto → 403", async ({ request }) => {
  const res = await request.get("/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=malo&hub.challenge=123");
  expect(res.status()).toBe(403);
});
