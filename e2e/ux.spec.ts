import { test, expect, Page } from "@playwright/test";

/**
 * E2E de EXPERIENCIA DE USUARIO: recorre la app como un usuario real y FALLA si aparece
 * cualquier error de consola o de runtime. Pruebas cortas y aisladas por flujo.
 */

function spyErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

function realErrors(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !/favicon/i.test(e) &&
      !/Failed to load resource.*(404|status of 4)/i.test(e) &&
      !/Download the React DevTools/i.test(e)
  );
}

async function assertClean(errors: string[]) {
  const real = realErrors(errors);
  expect(real, `Errores detectados:\n${real.join("\n")}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("NEXUS HQ").first()).toBeVisible();
});

test("UX · navegar las 6 áreas + subnav comercial sin errores", async ({ page }) => {
  const errors = spyErrors(page);
  for (const a of ["comercial", "marketing", "directiva", "ingenieria", "rrhh", "hq"]) {
    await page.getByTestId(`area-${a}`).click();
    await page.waitForTimeout(120);
  }
  await page.getByTestId("area-comercial").click();
  for (const v of ["deck", "pipeline", "leads", "calls", "whatsapp", "emails", "settings"]) {
    await page.getByTestId(`subnav-${v}`).click();
    await page.waitForTimeout(120);
  }
  await assertClean(errors);
});

test("UX · el panel 'Buscar leads REALES' está visible con sus 3 fuentes", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-comercial").click();
  await expect(page.getByTestId("web-niche")).toBeVisible();
  await expect(page.getByTestId("web-city")).toBeVisible();
  await expect(page.getByTestId("btn-web-search")).toBeVisible();
  await expect(page.getByTestId("src-web")).toBeVisible();
  await expect(page.getByTestId("src-places")).toBeVisible();
  await expect(page.getByTestId("src-apify")).toBeVisible();
  await assertClean(errors);
});

test("UX · sala de control: generar lead, cerrar pipeline, velocidad, reset", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("btn-toggle-run").click(); // pausa
  await page.getByTestId("btn-generar-lead").click();
  await page.getByTestId("btn-cerrar-pipeline").click();
  for (const s of ["1", "2", "4"]) {
    await page.getByRole("button", { name: `${s}x`, exact: true }).click();
  }
  await page.getByRole("button", { name: "Reiniciar simulación" }).click();
  await assertClean(errors);
});

test("UX · flujo de lead: abrir, escalar, ejecutar pipeline en lead fresco, Escape", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("btn-toggle-run").click(); // pausa
  // Lead FRESCO (abierto), para que el botón de pipeline esté habilitado
  await page.getByTestId("btn-generar-lead").click();
  await page.getByTestId("subnav-leads").click();
  await page.getByTestId("lead-row").first().click();
  await expect(page.getByTestId("lead-stage")).toBeVisible();
  await page.getByTestId("btn-escalate").click();
  await page.getByTestId("btn-run-pipeline").click();
  await expect(page.getByTestId("lead-stage")).toHaveText(/Calificado/);
  await page.keyboard.press("Escape"); // cierra el drawer
  await expect(page.getByTestId("lead-stage")).toHaveCount(0);
  await assertClean(errors);
});

test("UX · filtros y búsqueda de leads", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-leads").click();
  for (const f of ["Calientes", "Tibios", "Fríos", "Todos"]) {
    await page.getByRole("button", { name: f, exact: true }).click();
  }
  await page.getByPlaceholder("Buscar empresa…").fill("Trattoria");
  await page.getByPlaceholder("Buscar empresa…").fill("");
  await assertClean(errors);
});

test("UX · configuración: presets, canales, subagentes y toggles de agentes", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-settings").click();
  for (const p of ["economica", "premium", "equilibrada"]) {
    await page.getByTestId(`preset-${p}`).click();
  }
  await page.getByTestId("channels-no_voice").click();
  await page.getByTestId("channels-full").click();
  await page.getByTestId("btn-toggle-subagents").click();
  await page.getByTestId("btn-toggle-subagents").click();
  await page.getByTestId("btn-agents-all-off").click();
  await page.getByTestId("btn-agents-all-on").click();
  await assertClean(errors);
});

test("UX · marketing: toggle agente, ejecutar tarea (panel), cerrar con Escape", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-marketing").click();
  await page.getByTestId("btn-agent-toggle").first().click();
  await page.getByTestId("btn-agent-toggle").first().click();
  await page.getByTestId("btn-agent-run").first().click();
  await page.getByTestId("btn-task-run").click();
  await expect(page.getByTestId("task-deliverable")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Escape");
  await assertClean(errors);
});

test("UX · sin errores de hidratación al recargar con configuración cambiada", async ({ page }) => {
  // Cambia configuración (se persiste) y recarga: no debe haber errores de consola.
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-settings").click();
  await page.getByTestId("preset-premium").click();
  await page.getByTestId("channels-no_voice").click();
  await page.getByTestId("btn-agents-all-off").click();

  const errors = spyErrors(page);
  await page.reload();
  await expect(page.getByTestId("btn-toggle-run")).toBeVisible(); // Topbar, siempre presente
  await page.waitForTimeout(800); // deja que rehidrate
  await assertClean(errors);
});

test("UX · RR.HH. check-in y Emails envío de prueba", async ({ page }) => {
  const errors = spyErrors(page);
  await page.getByTestId("area-rrhh").click();
  await page.getByTestId("btn-checkin").first().click();
  await page.getByTestId("checkin-activity").fill("Recorrido E2E");
  await page.getByTestId("btn-confirm-checkin").click();
  await expect(page.getByText("Recorrido E2E").first()).toBeVisible();

  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-emails").click();
  await page.getByTestId("btn-send-test-email").click();
  await expect(page.getByTestId("email-test-result")).toBeVisible({ timeout: 15_000 });
  await assertClean(errors);
});
