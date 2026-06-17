import { test, expect, Page } from "@playwright/test";

// E2E REAL: prueba botones y funciones de verdad, verificando efectos en el estado.
// La simulación ambiental se PAUSA para que las aserciones sean deterministas.

async function num(page: Page, testid: string): Promise<number> {
  const txt = (await page.getByTestId(testid).innerText()).replace(/[^\d]/g, "");
  return Number(txt || "0");
}

async function pauseAmbient(page: Page) {
  const toggle = page.getByTestId("btn-toggle-run");
  if ((await toggle.innerText()).includes("En vivo")) await toggle.click();
  await expect(toggle).toContainText("Pausado");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Daptux").first()).toBeVisible();
});

test("HQ lobby muestra las áreas", async ({ page }) => {
  await expect(page.getByText("Toda la compañía operando en una sala")).toBeVisible();
  await expect(page.getByText("Actividad reciente del equipo")).toBeVisible();
});

test("navegación: cada área del sidebar renderiza su vista", async ({ page }) => {
  const main = page.getByRole("main");
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("area-marketing").click();
  await expect(main.getByText("Calendario de contenidos · esta semana")).toBeVisible();
  await page.getByTestId("area-ingenieria").click();
  await expect(main.getByText("Sprint actual")).toBeVisible();
  await page.getByTestId("area-directiva").click();
  await expect(main.getByText("Registro de decisiones")).toBeVisible();
  await page.getByTestId("area-rrhh").click();
  await expect(main.getByText("Personas reales · presencia y actividad")).toBeVisible();
  await page.getByTestId("area-hq").click();
  await expect(main.getByText("Toda la compañía operando en una sala")).toBeVisible();
});

test("BOTÓN Generar lead crea un lead real (métrica +1)", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await pauseAmbient(page);
  const before = await num(page, "metric-leads");
  await page.getByTestId("btn-generar-lead").click();
  await expect(page.getByTestId("metric-leads")).toHaveText(String(before + 1));
});

test("FUNCIÓN preparar mensaje: investiga, califica y deja un borrador real listo", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await pauseAmbient(page);
  await page.getByTestId("subnav-leads").click();
  await page.getByTestId("lead-row").first().click();
  await expect(page.getByTestId("lead-stage")).toBeVisible();
  await page.getByTestId("btn-run-pipeline").click();
  // No inventa cierres: queda calificado con un mensaje preparado (no enviado).
  await expect(page.getByTestId("lead-stage")).toHaveText(/Calificado/);
  await expect(page.getByTestId("outreach-message")).toBeVisible();
});

test("FUNCIÓN desenlace manual: marcar 'Ganado' mueve el lead a Cerrado", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await pauseAmbient(page);
  await page.getByTestId("subnav-leads").click();
  await page.getByTestId("lead-row").first().click();
  await page.getByTestId("btn-mark-won").click();
  await expect(page.getByTestId("lead-stage")).toHaveText(/Cerrado/);
});

test("BOTÓN Investigar y calificar todos prepara los leads abiertos", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await pauseAmbient(page);
  await page.getByTestId("btn-cerrar-pipeline").click();
  const result = page.getByTestId("control-result");
  await expect(result).toContainText(/\d+ de \d+ leads investigados y calificados/);
});

test("FUNCIÓN agente con subagentes produce un entregable", async ({ page }) => {
  await page.getByTestId("area-marketing").click();
  await page.getByTestId("btn-agent-run").first().click();
  await page.getByTestId("btn-task-run").click();
  // Real (con API key) o ejemplo simulado: en ambos casos hay entregable
  await expect(page.getByTestId("task-deliverable")).toBeVisible({ timeout: 25_000 });
});

test("FUNCIÓN check-in: una persona marca su actividad y se sella la hora", async ({ page }) => {
  await page.getByTestId("area-rrhh").click();
  await page.getByTestId("btn-checkin").first().click();
  await page.getByTestId("checkin-activity").fill("Probando el check-in real E2E");
  await page.getByTestId("btn-confirm-checkin").click();
  await expect(page.getByText("Probando el check-in real E2E").first()).toBeVisible();
  await expect(page.getByText("hace 0s").first()).toBeVisible();
});

test("BOTÓN play/pausa alterna el estado de la simulación", async ({ page }) => {
  const toggle = page.getByTestId("btn-toggle-run");
  const initial = await toggle.innerText();
  await toggle.click();
  await expect(toggle).not.toHaveText(initial);
});

test("CONFIG preset cambia la proyección de costo", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-settings").click();
  await page.getByTestId("preset-economica").click();
  const economica = await page.getByTestId("cost-projection").innerText();
  await page.getByTestId("preset-premium").click();
  const premium = await page.getByTestId("cost-projection").innerText();
  expect(premium).not.toBe(economica); // premium debe costar distinto (más)
});

test("MODO sin voz: el pipeline NO genera llamadas (canal de voz apagado)", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await pauseAmbient(page);
  // Activa modo sin voz en Configuración
  await page.getByTestId("subnav-settings").click();
  await page.getByTestId("channels-no_voice").click();
  // Vuelve a la sala y ejecuta el pipeline completo
  await page.getByTestId("subnav-deck").click();
  await page.getByTestId("btn-cerrar-pipeline").click();
  // Sin voz, la métrica de llamadas debe quedar en 0
  await expect(page.getByTestId("metric-llamadas")).toHaveText("0");
});

test("HONESTIDAD: investigar/calificar NO cierra tratos solo (no inventa cierres)", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await pauseAmbient(page);
  const cierresBefore = await num(page, "metric-cierres");
  await page.getByTestId("btn-cerrar-pipeline").click();
  // El motor determinista solo prepara: los cierres NO aumentan sin acción humana.
  await expect(page.getByTestId("metric-cierres")).toHaveText(String(cierresBefore));
});

test("CONTROL: desactivar un agente lo pone en reposo (ahorra API)", async ({ page }) => {
  await page.getByTestId("area-marketing").click();
  const station = page.getByTestId("btn-agent-toggle").first();
  await station.click(); // apaga el primer agente de marketing
  await expect(page.getByText("Desactivado").first()).toBeVisible();
});

test("CONTROL: 'Apagar todos' deja 0 agentes activos", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-settings").click();
  await page.getByTestId("btn-agents-all-off").click();
  await expect(page.getByTestId("agents-active-count")).toContainText(/^0\//);
  await page.getByTestId("btn-agents-all-on").click();
  await expect(page.getByTestId("agents-active-count")).not.toContainText(/^0\//);
});

test("AGENCIA: un lead marcado como ganado aparece como cuenta en Marketing", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await pauseAmbient(page);
  await page.getByTestId("subnav-leads").click();
  await page.getByTestId("lead-row").first().click();
  await page.getByTestId("btn-mark-won").click(); // cierre REAL marcado por el usuario
  await expect(page.getByTestId("lead-stage")).toHaveText(/Cerrado/);
  await page.keyboard.press("Escape"); // cierra el drawer
  await page.getByTestId("subnav-deck").click(); // MetricsBar vive en el Deck
  const cierres = await num(page, "metric-cierres");
  expect(cierres).toBeGreaterThan(0);
  await page.getByTestId("area-marketing").click();
  const accounts = await num(page, "marketing-accounts");
  expect(accounts).toBe(cierres);
});

test("PERSISTENCIA: la configuración sobrevive a una recarga", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-settings").click();
  await page.getByTestId("preset-premium").click();
  await expect(page.getByTestId("preset-premium")).toContainText("activo");
  await page.reload();
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-settings").click();
  await expect(page.getByTestId("preset-premium")).toContainText("activo", { timeout: 10_000 });
});

test("CANAL email: el botón de prueba ejecuta el envío (real o simulado)", async ({ page }) => {
  await page.getByTestId("area-comercial").click();
  await page.getByTestId("subnav-emails").click();
  await page.getByTestId("btn-send-test-email").click();
  await expect(page.getByTestId("email-test-result")).toContainText(/id /, { timeout: 15_000 });
});

test("REAL (si hay ANTHROPIC_API_KEY): un agente ejecuta una tarea con Claude real", async ({ page, request }) => {
  const status = await (await request.get("/api/budget")).json();
  test.skip(!status.claudeConnected, "Sin ANTHROPIC_API_KEY: se omite el test de Claude real.");

  await page.getByTestId("area-marketing").click();
  await page.getByTestId("btn-agent-run").first().click();
  await page.getByTestId("btn-task-run").click();
  // Entregable real + sin marca de "simulado"
  await expect(page.getByTestId("task-deliverable")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Ejemplo simulado", { exact: false })).toHaveCount(0);
  // El gasto del presupuesto debe haber subido
  const after = await (await request.get("/api/budget")).json();
  expect(after.budget.spentUsd).toBeGreaterThan(status.budget.spentUsd);
});
