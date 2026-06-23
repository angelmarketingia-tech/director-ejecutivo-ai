/**
 * Test del núcleo ANTI-BANEO. Reloj controlado (no espera de verdad).
 * Correr:  node --test whatsapp-connector/antiban.test.js
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { createRateLimiter } = require("./antiban");

test("respeta el tope POR MINUTO", () => {
  let t = 0;
  const rl = createRateLimiter({ perMin: 4, perHour: 999, dailyCap: 999, cooldownMs: 0, now: () => t });
  for (let i = 0; i < 4; i++) { assert.equal(rl.canSend("c" + i), null); rl.record("c" + i); }
  assert.equal(rl.canSend("z"), "tope por minuto");
  t += 61_000; // pasa 1 minuto → se libera
  assert.equal(rl.canSend("z"), null);
});

test("respeta el tope POR HORA", () => {
  let t = 0;
  const rl = createRateLimiter({ perMin: 999, perHour: 5, dailyCap: 999, cooldownMs: 0, now: () => t });
  for (let i = 0; i < 5; i++) { assert.equal(rl.canSend("c" + i), null); rl.record("c" + i); t += 1000; }
  assert.equal(rl.canSend("z"), "tope por hora");
  t += 3_600_001; // pasa 1 hora
  assert.equal(rl.canSend("z"), null);
});

test("respeta el tope DIARIO", () => {
  let t = 0;
  const rl = createRateLimiter({ perMin: 999, perHour: 999, dailyCap: 3, cooldownMs: 0, now: () => t });
  for (let i = 0; i < 3; i++) { assert.equal(rl.canSend("c" + i), null); rl.record("c" + i); t += 1000; }
  assert.equal(rl.canSend("z"), "tope diario");
});

test("respeta el COOLDOWN por contacto", () => {
  let t = 0;
  const rl = createRateLimiter({ perMin: 999, perHour: 999, dailyCap: 999, cooldownMs: 20_000, now: () => t });
  rl.record("a");
  assert.equal(rl.canSend("a"), "cooldown del contacto"); // mismo contacto, muy pronto
  assert.equal(rl.canSend("b"), null);                    // otro contacto sí
  t += 21_000;
  assert.equal(rl.canSend("a"), null);                    // pasó el cooldown
});

test("defaults conservadores (4/min, 40/h, 80/día, 20s cooldown)", () => {
  let t = 0;
  const rl = createRateLimiter({ now: () => t });
  for (let i = 0; i < 4; i++) { assert.equal(rl.canSend("c" + i), null); rl.record("c" + i); }
  assert.equal(rl.canSend("z"), "tope por minuto"); // 5º en el mismo minuto se bloquea
});
