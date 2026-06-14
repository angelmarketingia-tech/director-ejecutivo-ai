import { test, expect } from "@playwright/test";

/**
 * E2E de API/seguridad de endpoints de datos reales y login. No requieren claves:
 * validan el comportamiento honesto (sin clave → lo dice; validación; sin relay).
 */

test("API · /api/leads/discover valida campos faltantes (400)", async ({ request }) => {
  const r = await request.post("/api/leads/discover", { data: { niche: "" } });
  expect(r.status()).toBe(400);
});

test("API · /api/leads/discover sin clave responde honesto (no inventa)", async ({ request }) => {
  const r = await request.post("/api/leads/discover", { data: { niche: "restaurantes", city: "Quito" } });
  const j = await r.json();
  // Sin ANTHROPIC_API_KEY: ok:false + noKey. Con clave: ok:true (datos reales).
  if (!j.ok) {
    expect(j.noKey).toBe(true);
    expect(String(j.error)).toMatch(/no invento|ANTHROPIC/i);
  } else {
    expect(Array.isArray(j.leads)).toBe(true);
  }
});

test("API · /api/leads/apify valida campos y reporta falta de token", async ({ request }) => {
  const bad = await request.post("/api/leads/apify", { data: { city: "Quito" } });
  expect(bad.status()).toBe(400);

  const r = await request.post("/api/leads/apify", { data: { niche: "restaurantes", city: "Quito" } });
  const j = await r.json();
  if (!j.ok) expect(j.noToken === true || typeof j.error === "string").toBeTruthy();
});

test("API · login: página /login renderiza", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-submit")).toBeVisible();
  await expect(page.getByTestId("login-user")).toBeVisible();
  await expect(page.getByTestId("login-password")).toBeVisible();
});

test("API · login rechaza JSON vacío / sin configurar", async ({ request }) => {
  const r = await request.post("/api/auth/login", { data: { user: "x", password: "y" } });
  // Sin APP_PASSWORD configurada → 500 (no configurado). Con ella → 401 si no coincide.
  expect([401, 500]).toContain(r.status());
});

test("API · login con credenciales correctas (si están configuradas)", async ({ request }) => {
  const U = process.env.APP_USER;
  const P = process.env.APP_PASSWORD;
  test.skip(!P, "APP_PASSWORD no configurada en el entorno de pruebas.");
  const r = await request.post("/api/auth/login", { data: { user: U, password: P } });
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  expect(j.ok).toBe(true);
});
