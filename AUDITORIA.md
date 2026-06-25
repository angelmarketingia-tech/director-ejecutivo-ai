# Auditoría de producción — Daptux NEXUS HQ (hacia 10/10)

> Estado honesto del producto frente a la Definición de Hecho del `/goal`. Marca [x] = verificado
> con evidencia (build/E2E/unit/inspección); [~] = parcial/roadmap; [ ] = pendiente.
> Evidencia base (esta sesión): `tsc --noEmit` limpio · `npm run build` limpio · **E2E 59 verde**
> (2 skipped por claves) · **unit anti-baneo 5/5**.

## 1) Resumen de auditoría
La base es **sólida y honesta**: sin datos falsos, rutas con `runtime`, validación + rate limit,
páginas `error`/`not-found`, sin `console.log` de depuración, 1 solo stub conocido (Google Calendar).
Esta sesión cerró brechas de **resiliencia** (reintentos a la API), **rendimiento** (canvas) y
**cobertura de pruebas**. Lo que falta para un "10/10" pleno es mayormente trabajo incremental
(QA-que-corrige en Desarrollo, más observabilidad) y decisiones de negocio (no de código).

## 2) Olas completadas (con evidencia)
- **Ola 1 · Auditoría:** baseline verde + escaneo de riesgos (TODOs, logs, runtime). ✓
- **Ola 2 · Resiliencia:** `withRetry` en `claude.ts` — reintenta SOLO transitorios (429/5xx/overloaded/red)
  con backoff exponencial + jitter; nunca 400/refusal/presupuesto. Verificado: build OK. ✓
- **Rendimiento (sesión previa):** canvas a 8/14 fps + pausa con pestaña oculta y fuera de viewport;
  fin del bug de redimensionar el canvas cada frame. ✓
- **Cobertura E2E:** +Directiva/finanzas, +agente (opt-out, auto-off, ráfaga), +tema, +historial,
  +seguridad de endpoints. Total **59 E2E + 5 unit**. ✓

## 3) Definición de Hecho — checklist con estado
### A. Robustez
- [x] Sin 404/500 crudos (`error.tsx`, `not-found`); estados de carga/vacío en vistas clave.
- [x] Validación de entrada + límites de payload + rate limit en endpoints.
- [x] Idempotencia de envíos WhatsApp (lock + `doneIds` + dedupe server) — unit/diseño.
- [x] Reintentos con backoff ante transitorios (nuevo).
- [~] Estados de error explícitos en el 100% de vistas secundarias (revisar las menos usadas).

### B. Rendimiento
- [x] Canvas con tope de FPS + pausa cuando no se ve (CPU en reposo baja).
- [x] Endpoints IA dentro de 300s (orquestación por partes).
- [~] LCP < 2.5s medido formalmente (no medido con Lighthouse en esta sesión).
- [~] Auditoría de KV por request (acotado por diseño; falta medición bajo carga real).

### C. Seguridad
- [x] Auth cookie firmada + RBAC (admin/member); rutas con sesión → 401 (E2E).
- [x] Rate limiting + cabeceras de seguridad (E2E security.spec).
- [x] Secretos solo en env; webhook WhatsApp verifica token (E2E).
- [~] Revisión formal de inyección/IDOR/CSRF + CSP (pendiente; CSP requiere nonce por el script de tema).

### D. UX
- [x] Responsive (desktop+móvil, E2E sin scroll horizontal); tema claro/oscuro (E2E persistente).
- [x] Feedback de acción (loading/éxito/error) en flujos principales.
- [~] Accesibilidad AA auditada formalmente (semántica/contraste presentes; falta pase con axe).

### E. Funcionalidad por área (real)
- [x] Comercial: pipeline honesto; WhatsApp tiempo real coherente con KB (historial completo);
      ráfagas (1 respuesta humana); anti-baneo (5/5 unit); cierre 1-clic con demo; lotes; handoff.
- [x] Desarrollo: Constructor con Higgsfield en vivo + biblioteca; historial persistente.
- [x] KB extensa (500k) + carga .md/.txt/.PDF.
- [x] Directiva: cotizaciones/suscripciones/pagos (E2E visible).
- [x] Auditoría de gasto de tokens por usuario/acción; KPIs.
- [~] Desarrollo "QA que corrige" (hoy QA reporta; aplicar correcciones = mejora pendiente).
- [~] Multi-imagen Higgsfield por sección (hoy hero; secundarias por Pexels).

### F. Ingeniería
- [x] `tsc` y `build` limpios; sin código muerto evidente; sin debug logs.
- [x] E2E amplio (59) + API/seguridad + unit del núcleo anti-baneo (5).
- [~] Observabilidad ampliada (logs útiles existen; falta panel/endpoint de salud y métricas).

## 4) Riesgos residuales / pendientes priorizados
1. **Despliegue bloqueado por permisos de GitHub:** la cuenta `Daptux` es de solo-lectura en
   `angelmarketingia-tech/director-ejecutivo-ai` → `git push` da 403. Acción: re-login con la cuenta
   dueña, o dar a Daptux acceso *Write* (Settings → Collaborators). Sin esto, nada nuevo se despliega.
2. **QA-que-corrige (Desarrollo):** subir calidad aplicando las correcciones del QA al HTML (con cuidado
   de truncación). Mejora real de producto.
3. **Medición formal:** Lighthouse (LCP), axe (accesibilidad), revisión de seguridad con `/security-review`.
4. **Observabilidad:** endpoint de salud + métricas de errores (sin exponer secretos).
5. **Google Calendar:** stub (no core) — implementar o retirar de la UI.

## 5) Notas de despliegue / operación
- **Vercel** auto-despliega desde `main` (requiere el push, hoy bloqueado por permisos — ver riesgo 1).
- **Conector WhatsApp:** proceso local; reiniciar tras cambios (`Ctrl+C` → `node index.js`).
  Anti-baneo: 4/min · 40/h · 80/día · cooldown 20s · pausa larga · verifica número con WhatsApp.
- **Variables de entorno (Vercel):** `ANTHROPIC_API_KEY`, `API_SHARED_SECRET` (= conector),
  `HIGGSFIELD_CREDENTIALS`, `PEXELS_API_KEY`, `RESEND_API_KEY`/`EMAIL_FROM`, KV (`UPSTASH_*`),
  `APP_USER`/`APP_PASSWORD`. Sin claves, cada función lo dice (no inventa).

## 6) Nota honesta sobre "valoración de USD 1.000.000"
El trabajo deja el **producto** con robustez/seguridad/UX de nivel comercial. El **valor de mercado**
real depende de tracción, clientes, ingresos y retención — no solo del código. Este informe cubre la
parte técnica; el resto es ejecución comercial.
