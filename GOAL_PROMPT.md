# /goal — Llevar Daptux NEXUS HQ a producción de nivel unicornio (10/10)

> Pega este texto después de `/goal`. Es un brief de misión para un agente autónomo:
> que lleve TODA la aplicación a calidad de producto de clase mundial, listo para uso
> intensivo y comercialización a alto valor. Trabaja de forma rigurosa, verificable y honesta.

---

## CONTEXTO
Trabajas sobre **Daptux NEXUS HQ** (repo actual): un centro de mando comercial con IA en
Next.js 14 (App Router) + TypeScript + Tailwind + Zustand, persistencia en Upstash KV,
Claude (@anthropic-ai/sdk) como cerebro de agentes, e integraciones reales (Higgsfield API,
Pexels, Resend, conector de WhatsApp Web anti-baneo). Módulos principales:
- **Comercial (núcleo de negocio):** pipeline de leads (investigar → calificar → redactar →
  contactar/cerrar), bandeja de WhatsApp en vivo, bot auto-respuesta con base de conocimiento,
  cierre 1-clic con demo, envío por lotes anti-baneo, emails.
- **Desarrollo:** equipo multi-agente (Arquitecto → Implementador → QA) que genera webs/MVP de
  alta calidad con imágenes Higgsfield en vivo; historial de proyectos persistente.
- **Otras áreas:** Marketing, Directiva (finanzas/cotizaciones/pagos), RR.HH., HQ (oficina pixel),
  multiusuario con roles (admin/member), auditoría de gasto de tokens, tema claro/oscuro.

## PRINCIPIOS INNEGOCIABLES (no los rompas nunca)
1. **Cero datos falsos.** Si algo no se puede hacer real, dilo; nunca inventes leads,
   conversaciones, métricas, cierres ni resultados.
2. **Anti-baneo de WhatsApp blindado.** Nada de envíos masivos en frío sin control; respeta
   topes (min/hora/día), cooldown, ritmo humano y agrupación de ráfagas.
3. **Secretos solo en variables de entorno** (Vercel), jamás en el repo.
4. **No romper lo que ya funciona.** Cada cambio se verifica con build + E2E antes de darlo por hecho.
5. **Honestidad operativa:** reporta fallos reales con su salida; no declares "listo" sin verificar.

## OBJETIVO
Dejar la aplicación **10/10 en cada función**, sin bugs, optimizada y lista para **uso intensivo
y comercialización**: el estándar de calidad, robustez y seguridad que justificaría una inversión
y valoración de nivel empresarial (objetivo de referencia: producto vendible/valorable en el
orden de USD 1.000.000). Traduce esa ambición en EXCELENCIA TÉCNICA concreta, medible y verificable.

---

## ESTÁNDARES DE CALIDAD 10/10 (criterios de aceptación)

### A. Robustez y confiabilidad
- [ ] Ningún flujo se cuelga, congela ni muestra 404/500 crudos. Estados de carga, error y vacío
      en TODA vista (con reintento). `app/error.tsx` y `not-found` cubren fallos.
- [ ] Manejo de errores defensivo en cada endpoint: validación de entrada, límites de payload,
      timeouts, mensajes honestos (sin filtrar internals). Nada de promesas sin `catch`.
- [ ] Idempotencia donde importa (envíos WhatsApp/email una sola vez; sin duplicados).
- [ ] Reintentos con backoff para llamadas a IA/integraciones; degradación elegante si falta una clave.

### B. Rendimiento (uso intensivo)
- [ ] Sin fugas de memoria ni bucles de render. Animaciones canvas con tope de FPS y pausa cuando
      no se ven (pestaña oculta / fuera de viewport). CPU en reposo cercana a 0.
- [ ] Carga inicial rápida (LCP < 2.5s en una vista típica), code-splitting, imágenes lazy/optimizadas.
- [ ] Endpoints de IA dentro del límite de Vercel (300s Pro); trabajo pesado orquestado por partes.
- [ ] KV: lecturas/escrituras acotadas (índices ligeros, caps), sin O(n) innecesario por request.

### C. Seguridad
- [ ] Auth multiusuario sólida (cookie firmada), RBAC correcto (admin vs member), rutas y acciones
      protegidas. Endpoints sensibles → 401/403 sin sesión/secreto.
- [ ] Rate limiting en todos los endpoints públicos. Cabeceras de seguridad. Sanitización/escape.
- [ ] Sin secretos en cliente ni repo. Webhooks verificados. Listas de destinatarios permitidas.
- [ ] Pasa una revisión de seguridad básica (inyección, IDOR, exposición de datos, CSRF donde aplique).

### D. UX/Producto (clase mundial)
- [ ] Interfaz pulida, coherente, responsive impecable (móvil y desktop), tema claro/oscuro perfecto
      en cada pantalla, accesibilidad AA (semántica, contraste, foco visible, aria).
- [ ] Microinteracciones y feedback claro en cada acción (loading, éxito, error). Cero estados ambiguos.
- [ ] Flujos comerciales **de principio a fin** sin fricción: prospectar → contactar → conversar →
      cerrar → cobrar → registrar. El usuario nunca queda "atascado".

### E. Funcionalidad por área (todo operativo y real)
- [ ] **Comercial:** pipeline con IA real y honesto; WhatsApp con bandeja en tiempo real, bot coherente
      con la KB (usa todo el historial), respuesta humana a ráfagas, anti-baneo, cierre 1-clic con demo,
      lotes seguros, seguimientos. Detección de lead caliente y handoff humano fluido.
- [ ] **Desarrollo:** Constructor genera webs/MVP nivel agencia (Awwwards) con Higgsfield en vivo;
      QA que además corrige; multi-imagen; historial persistente; vista previa y publicación.
- [ ] **Base de conocimiento:** extensa (sin límites cortos), carga de .md/.txt/.PDF, editable por admin,
      usada como fuente de verdad por el bot.
- [ ] **Directiva/Finanzas:** cotizaciones, suscripciones, links de pago, resumen financiero reales.
- [ ] **Auditoría:** gasto de tokens por usuario/acción; KPIs y resumen diario reales.

### F. Calidad de ingeniería
- [ ] `tsc --noEmit` sin errores; `npm run build` limpio; sin warnings críticos.
- [ ] Cobertura E2E AMPLIA (Playwright) de cada función y cada área + pruebas de API/seguridad +
      pruebas unitarias del núcleo crítico (anti-baneo, dedupe, scoring). Todo verde.
- [ ] Código legible y consistente con el estilo del repo; comentarios donde aporta; sin código muerto.
- [ ] Observabilidad: logs útiles, manejo de errores trazable, y panel/resumen de estado del sistema.

---

## PLAN DE TRABAJO SUGERIDO (itera en olas, verificando cada una)
1. **Auditoría inicial:** recorre el repo, corre `tsc`, `build` y la suite E2E; lista TODOS los
   bugs, deudas, vacíos y riesgos (seguridad/rendimiento/UX). Prioriza por impacto.
2. **Estabilización:** arregla bugs y bordes; añade estados de carga/error/vacío faltantes;
   blinda endpoints (validación, rate limit, auth).
3. **Núcleo comercial 10/10:** perfecciona el pipeline y el agente de WhatsApp de punta a punta
   (coherencia KB, ráfagas, anti-baneo, cierre con demo, seguimientos, handoff).
4. **Desarrollo 10/10:** sube la calidad del Constructor (QA que corrige, multi-imagen Higgsfield),
   y asegura el historial/publicación.
5. **Rendimiento y UX:** optimiza render/canvas/carga; pule responsive, tema y accesibilidad.
6. **Seguridad:** revisión completa y correcciones.
7. **Verificación final:** amplía E2E hasta cubrir cada función; todo verde; build limpio.

## VERIFICACIÓN OBLIGATORIA (antes de declarar cualquier cosa "hecha")
- Corre y muestra: `npx tsc --noEmit`, `npm run build`, `npx playwright test`, y los tests
  unitarios del conector (`node --test whatsapp-connector/`). Todo debe pasar.
- Para cambios de UI, valida visualmente (capturas) en claro y oscuro, desktop y móvil.
- No marques una tarea como completa si su prueba no existe o no pasa.

## RESTRICCIONES
- No introduzcas dependencias innecesarias ni de origen dudoso. Justifica cada nueva librería.
- No degrades el anti-baneo ni el principio de "cero datos falsos" para ganar features.
- No expongas credenciales. No hagas envíos reales no solicitados.

## ENTREGABLES
1. Informe de auditoría inicial (bugs/riesgos priorizados).
2. Cambios implementados por olas, cada uno con su verificación (build/E2E) y resumen.
3. Suite de pruebas ampliada (E2E + API + unit) toda en verde.
4. Lista final de "Definición de hecho" marcada (los criterios A–F arriba) con evidencia.
5. Notas de despliegue y de operación (qué variables de entorno, cómo escalar, riesgos residuales).

## DEFINICIÓN DE HECHO (Done)
La app está **10/10** cuando: build limpio, toda la suite verde, cada criterio A–F cumplido con
evidencia, sin bugs conocidos, segura, rápida bajo uso intensivo, y cada flujo comercial y de
desarrollo funciona de principio a fin con datos reales — lista para vender y operar a escala.
