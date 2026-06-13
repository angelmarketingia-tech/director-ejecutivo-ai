import { test, expect, Page } from "@playwright/test";

/**
 * E2E MÓVIL (viewport Pixel 5). Verifica que la app funciona perfectamente en móvil:
 * menú hamburguesa, navegación por drawer, sin scroll horizontal y flujos reales,
 * todo sin errores de consola/runtime.
 *
 * Nota: el sidebar de escritorio queda en el DOM (oculto por CSS), así que TODA
 * navegación en móvil se hace dentro del drawer (`mobile-drawer`) para evitar
 * coincidencias duplicadas de testid.
 */

function spyErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`console.error: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}
const realErrors = (e: string[]) =>
  e.filter((x) => !/favicon/i.test(x) && !/status of 4|Download the React/i.test(x));

async function hOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

const drawer = (page: Page) => page.getByTestId("mobile-drawer");

async function navTo(page: Page, area: string) {
  await page.getByTestId("btn-mobile-nav").click();
  await drawer(page).getByTestId(`area-${area}`).click();
  await expect(drawer(page)).toHaveCount(0); // el drawer se cierra al navegar
}

async function navSub(page: Page, view: string) {
  // La sub-navegación comercial solo aparece con el área Comercial activa.
  await navTo(page, "comercial");
  await page.getByTestId("btn-mobile-nav").click();
  await drawer(page).getByTestId(`subnav-${view}`).click();
  await expect(drawer(page)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("btn-mobile-nav")).toBeVisible();
});

test("MÓVIL · botón de menú visible; el drawer está cerrado al inicio", async ({ page }) => {
  await expect(page.getByTestId("btn-mobile-nav")).toBeVisible();
  await expect(page.getByTestId("mobile-drawer")).toHaveCount(0);
});

test("MÓVIL · hamburguesa abre el drawer, navega y se cierra", async ({ page }) => {
  await page.getByTestId("btn-mobile-nav").click();
  await expect(drawer(page)).toBeVisible();
  await drawer(page).getByTestId("area-marketing").click();
  await expect(drawer(page)).toHaveCount(0);
  await expect(page.getByRole("main").getByText("Servicios de la agencia")).toBeVisible();
});

test("MÓVIL · sin scroll horizontal en las vistas clave", async ({ page }) => {
  expect(await hOverflow(page)).toBeLessThanOrEqual(1); // HQ

  for (const area of ["comercial", "marketing", "directiva", "ingenieria", "rrhh"]) {
    await navTo(page, area);
    await page.waitForTimeout(200);
    expect(await hOverflow(page), `overflow en ${area}`).toBeLessThanOrEqual(1);
  }

  for (const v of ["leads", "pipeline", "settings"]) {
    await navSub(page, v);
    await page.waitForTimeout(200);
    expect(await hOverflow(page), `overflow en ${v}`).toBeLessThanOrEqual(1);
  }
});

test("MÓVIL · flujo real: generar lead y cerrar pipeline sin errores", async ({ page }) => {
  const errors = spyErrors(page);
  await navTo(page, "comercial");
  await page.getByTestId("btn-toggle-run").click(); // pausa
  const before = Number((await page.getByTestId("metric-leads").innerText()).replace(/\D/g, ""));
  await page.getByTestId("btn-generar-lead").click();
  await expect(page.getByTestId("metric-leads")).toHaveText(String(before + 1));
  await page.getByTestId("btn-cerrar-pipeline").click();
  await expect(page.getByTestId("control-result")).toContainText(/ganados/);
  expect(realErrors(errors), realErrors(errors).join("\n")).toEqual([]);
});

test("MÓVIL · check-in de persona funciona en pantalla pequeña", async ({ page }) => {
  await navTo(page, "rrhh");
  await page.getByTestId("btn-checkin").first().click();
  await page.getByTestId("checkin-activity").fill("Check-in móvil");
  await page.getByTestId("btn-confirm-checkin").click();
  await expect(page.getByText("Check-in móvil").first()).toBeVisible();
});
