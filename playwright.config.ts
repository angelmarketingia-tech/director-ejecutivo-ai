import { defineConfig, devices } from "@playwright/test";

/**
 * E2E real: levanta la app en el puerto 3100 y prueba botones/funciones de verdad.
 * `npm run e2e` (headless) o `npm run e2e:headed`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  // Reintentos para absorber fallos transitorios (servidor en vivo, timing).
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 8000, // un click a un elemento bloqueado falla rápido, no cuelga la suite
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
