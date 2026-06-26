import { test, expect, Page } from "@playwright/test";

/**
 * Accesibilidad (axe-core). Verifica 0 violaciones SERIAS/CRÍTICAS en las pantallas clave,
 * en tema claro y oscuro. axe se baja en Node y se inyecta inline (el CSP permite unsafe-inline).
 * Si no hay red para bajar axe, el test se omite (no rompe la suite offline).
 */
const AXE = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";
let axeSrc: string | null = null;

async function getAxe(): Promise<string | null> {
  if (axeSrc !== null) return axeSrc || null;
  try { axeSrc = await (await fetch(AXE)).text(); } catch { axeSrc = ""; }
  return axeSrc || null;
}

async function serious(page: Page): Promise<{ id: string; impact: string }[]> {
  const src = await getAxe();
  test.skip(!src, "No se pudo descargar axe-core (sin red).");
  await page.addScriptTag({ content: src! });
  return await page.evaluate(async () => {
    // @ts-ignore
    const r = await (window as any).axe.run(document, { resultTypes: ["violations"] });
    return r.violations
      .filter((v: any) => v.impact === "serious" || v.impact === "critical")
      .map((v: any) => ({ id: v.id, impact: v.impact }));
  });
}

test("a11y · login (oscuro) sin violaciones serias", async ({ page }) => {
  await page.goto("/login");
  await page.waitForTimeout(400);
  const v = await serious(page);
  expect(v, JSON.stringify(v)).toEqual([]);
});

test("a11y · login (claro) sin violaciones serias", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => document.documentElement.classList.add("light"));
  await page.waitForTimeout(400);
  const v = await serious(page);
  expect(v, JSON.stringify(v)).toEqual([]);
});

test("a11y · app (oscuro) sin violaciones serias", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(800);
  const v = await serious(page);
  expect(v, JSON.stringify(v)).toEqual([]);
});

test("a11y · app (claro) sin violaciones serias", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.documentElement.classList.add("light"));
  await page.waitForTimeout(600);
  const v = await serious(page);
  expect(v, JSON.stringify(v)).toEqual([]);
});
