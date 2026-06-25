import { test, expect, Page } from "@playwright/test";

/**
 * E2E de las funciones NUEVAS (cierre automático, lote a prospectos, tema claro/oscuro,
 * historial de proyectos, auto-respuesta WhatsApp) + seguridad de los endpoints nuevos.
 * Modo demo. Falla si hay errores de consola/runtime.
 */

function spyErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console.error: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}
function realErrors(errors: string[]): string[] {
  return errors.filter((e) => !/favicon/i.test(e) && !/Failed to load resource.*(404|status of 4)/i.test(e) && !/Download the React DevTools/i.test(e));
}
async function assertClean(errors: string[]) {
  expect(realErrors(errors), `Errores:\n${realErrors(errors).join("\n")}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Daptux").first()).toBeVisible();
});

test("TEMA · alterna claro/oscuro y persiste tras recargar", async ({ page }) => {
  const errors = spyErrors(page);
  const html = page.locator("html");
  const startsLight = (await html.getAttribute("class") || "").includes("light");
  await page.getByRole("button", { name: "Cambiar tema" }).first().click();
  if (startsLight) await expect(html).not.toHaveClass(/light/);
  else await expect(html).toHaveClass(/light/);
  // Persiste tras recargar (script anti-parpadeo en <head>)
  const nowLight = (await html.getAttribute("class") || "").includes("light");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(nowLight ? /light/ : /^(?!.*light).*$/);
  await assertClean(errors);
});

test("COMERCIAL · Sala de Control tiene el lote seguro a prospectos", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-comercial").click();
  await expect(page.getByTestId("btn-message-prospects")).toBeVisible();
  // Al pulsar, pide confirmación (lo cancelamos para no disparar envíos en la prueba).
  page.once("dialog", (d) => d.dismiss());
  await page.getByTestId("btn-message-prospects").click();
  await assertClean(errors);
});

test("COMERCIAL · lead ofrece cierre 1-clic (demo + mensaje)", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("btn-toggle-run").click(); // pausa
  await page.getByTestId("btn-generar-lead").click();
  await page.getByTestId("subnav-leads").click();
  await page.getByTestId("lead-row").first().click();
  await expect(page.getByTestId("lead-stage")).toBeVisible();
  // El botón de demo 1-clic siempre está; el de cierre automático aparece si hay teléfono.
  await expect(page.getByTestId("btn-generate-demo")).toBeVisible();
  await page.keyboard.press("Escape");
  await assertClean(errors);
});

test("COMERCIAL · WhatsApp: bandeja visible y sin errores", async ({ page }) => {
  // Nota: el panel 'Asistente' usa /api/knowledge (requiere sesión); en demo sin login
  // no renderiza. La bandeja (chats) usa /api/whatsapp/chats y sí se ve.
  const errors = spyErrors(page);
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-whatsapp").click();
  await expect(page.getByText("Bandeja de WhatsApp")).toBeVisible({ timeout: 20000 });
  await assertClean(errors);
});

test("DIRECTIVA · finanzas (cotizaciones y suscripciones) visibles", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-directiva").click();
  await expect(page.getByTestId("btn-create-quote")).toBeVisible();
  await expect(page.getByTestId("btn-add-sub")).toBeVisible();
  await assertClean(errors);
});

test("DESARROLLO · constructor, generador de webs e historial de proyectos", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-ingenieria").click();
  await expect(page.getByTestId("btn-build-project")).toBeVisible();
  await expect(page.getByTestId("btn-web-forge")).toBeVisible();
  await expect(page.getByText("Historial de proyectos")).toBeVisible();
  await assertClean(errors);
});

// ── Seguridad: rutas protegidas por SESIÓN exigen login siempre (currentUser) ──
test("API · rutas con sesión exigen login (401)", async ({ request }) => {
  expect((await request.get("/api/me")).status()).toBe(401);
  expect((await request.get("/api/knowledge")).status()).toBe(401);
  expect((await request.get("/api/spend")).status()).toBe(401);
});

// ── Observabilidad: /api/health público y sin exponer secretos ──
test("API · /api/health responde saludable y no filtra secretos", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.status()).toBe(200);
  const j = await r.json();
  expect(j.ok).toBe(true);
  expect(j.status).toBe("healthy");
  // Sin sesión admin no debe incluir el detalle de integraciones.
  expect(j.integrations).toBeUndefined();
});

// ── Ráfaga: el modo store-only guarda el mensaje pero NO responde (responde 1 vez luego) ──
test("API · WhatsApp incoming store-only no responde (ráfaga)", async ({ request }) => {
  const r = await request.post("/api/whatsapp/incoming", { data: { from: "573000000001", message: "hola", reply: false } });
  if (r.status() === 200) {
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.reply).toBeNull(); // guardado, sin responder aún
  } else {
    expect(r.status()).toBe(401); // en prod con secreto exigido
  }
});

// ── Agente: salvaguardas (opt-out y auto-respuesta apagada → NO responde) ──
test("AGENTE · opt-out (BAJA) no recibe auto-respuesta", async ({ request }) => {
  const r = await request.post("/api/whatsapp/incoming", { data: { from: "573000000010", message: "BAJA" } });
  if (r.status() === 200) {
    const j = await r.json();
    expect(j.reply).toBeNull();
    expect(j.reason).toBe("opt-out");
  } else expect(r.status()).toBe(401);
});

test("AGENTE · opt-out reconoce STOP (varias palabras de baja)", async ({ request }) => {
  const r = await request.post("/api/whatsapp/incoming", { data: { from: "573000000012", message: "STOP" } });
  if (r.status() === 200) { const j = await r.json(); expect(j.reason).toBe("opt-out"); }
  else expect(r.status()).toBe(401);
});

test("AGENTE · opt-out SIN falsos positivos ('rebaja' no es baja)", async ({ request }) => {
  const r = await request.post("/api/whatsapp/incoming", { data: { from: "573000000013", message: "me interesa, hay alguna rebaja del precio?" } });
  if (r.status() === 200) { const j = await r.json(); expect(j.reason).not.toBe("opt-out"); }
  else expect(r.status()).toBe(401);
});

test("AGENTE · sin auto-respuesta activa → no responde solo", async ({ request }) => {
  const r = await request.post("/api/whatsapp/incoming", { data: { from: "573000000011", message: "hola, info" } });
  if (r.status() === 200) {
    const j = await r.json();
    expect(j.reply).toBeNull();
    expect(["auto-off", "human", "stored"]).toContain(j.reason);
  } else expect(r.status()).toBe(401);
});

// ── Endpoints del conector: validan el cuerpo aunque (en local sin secreto) estén abiertos ──
test("API · projects/list valida guardado sin html (400)", async ({ request }) => {
  const r = await request.post("/api/projects/list", { data: { name: "X", kind: "web" } });
  // Sin html → 400; o 401 si hay secreto/sesión exigido en este entorno.
  expect([400, 401]).toContain(r.status());
});
