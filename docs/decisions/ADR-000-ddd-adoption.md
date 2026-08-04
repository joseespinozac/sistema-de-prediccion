# ADR-000 — Adoptar Documentation-Driven Development

> **Date:** 2026-08-04
> **Status:** accepted

---

## 1. Contexto

El proyecto creció con tres documentos sueltos en la raíz
(`README.md`, `ROADMAP.md`, `BITACORA.md`, `implementation-plan.md`)
que servían propósitos diferentes pero sin flujo formal entre ellos:

- `README.md` — cómo correr el proyecto.
- `ROADMAP.md` — features planeadas (15 entradas, mezcla de status con
  emojis 📋/✅/📄/🔧).
- `BITACORA.md` — histórico en prosa, append-only.
- `implementation-plan.md` — diseño monolítico de 300 líneas (objetivos,
  arquitectura, modelo de datos, fases 1–5, riesgos).

No hay un spec de feature por ningún lado. Cuando un agente (humano o
de IA) tiene que modificar el código, no hay un lugar canónico donde
mirar "qué dice el plan sobre esta feature"; tiene que inferir del
`implementation-plan.md` + cruzar con `ROADMAP.md` + re-construir el
contexto desde cero cada vez.

Esto es exactamente la fricción que el proyecto gemelo
`sistema-control-de-inventarios` documentó y resolvió en su propio
`ADR-000` (julio 2026).

## 2. Problema

¿Cómo introducir una disciplina de documentación que (a) no rompa el
ritmo de desarrollo que ya tiene el proyecto, (b) dé trazabilidad real
de por qué cada feature existe y qué decisión la motivó, y (c) sobreviva
al hecho de que el proyecto es de un solo equipo pequeño (no un
monorepo con varios apps)?

## 3. Alternativas

### A. No hacer nada (status quo)

Seguir con los 3 archivos sueltos + el plan monolítico en raíz.

**Pro:** Cero fricción, cero reescritura.
**Contra:** Misma fricción operativa de siempre; cada vez que se
discuta una feature hay que reconstruir el contexto. Las features
implementadas se pierden en el ruido del ROADMAP (solo la v1 del
detector de patrones está marcada ✅).

### B. Adoptar el flujo DDD del proyecto gemelo

Replicar `docs/{governance,design-document,design-system,roadmap,
progress}.md` + `features/` + `rfcs/` + `decisions/` + `implementation/`
+ `scripts/check-docs.*` + `AGENTS.md` raíz, con un ADR-000 que
promulga la disciplina y un script verificador que falla si la
estructura se rompe.

**Pro:** Disciplina probada en producción. Numeración ADR/RFC
consecutiva previene huecos. Specs de 13 secciones evitan el
"implementar primero, documentar después" que degrada la calidad de
la spec. El check script es ejecutable en CI o local.

**Contra:** Costo inicial de migración (mover 3 archivos a `docs/`,
archivar los originales, escribir 5 templates, escribir 5 ADRs
fundacionales, crear el script). ~25–30 archivos tocados en esta
primera wave.

### C. Versión minimalista (solo governance + features + decisions)

Saltarse `design-document.md`/`design-system.md` y mantener el
`implementation-plan.md` como referencia viva.

**Pro:** Menos movimiento de archivos. La información ya está en
`implementation-plan.md`.
**Contra:** El plan monolítico actual mezcla "qué hay hoy" con "qué
se va a hacer en cada fase", que es exactamente la confusión que el
flujo DDD ataca. Sin design-doc separado, el spec de una feature no
tiene un lugar adyacente al modelo de datos al que referenciar.

## 4. Decisión

**Adoptar opción B.** Replicar el flujo DDD del proyecto
`sistema-control-de-inventarios` con las adaptaciones para el alcance
más pequeño de este proyecto:

- 2 branches (`development` + `production`), no 4 — ver
  [`ADR-005`](ADR-005-environment-branching-strategy.md).
- 1 solo árbol de código (no Nx monorepo).
- Scopes de commit: `backend`, `frontend`, `prediction-service`,
  `docs`, `infra`, `deps`.
- Sin `pretest` (no hay framework de tests todavía); se agrega
  cuando se introduzcan tests.
- Numeración ADR/RFC arranca en 000 con padding de 3 dígitos.

Reglas del flujo (resumen; el detalle vive en
[`docs/governance.md`](../governance.md)):

1. **No se implementa sin spec.** Una feature vive en
   `docs/features/<slug>.md` con al menos Resumen + Problema +
   Objetivos + Definition of Done antes de que `docs/implementation/`
   la pueda referenciar.
2. **El código refleja la spec.** Si la implementación diverge, se
   actualiza la spec en el mismo commit (o se corrige el código).
3. **Documentación siempre al día.** `docs/design-document.md` es la
   fuente de verdad del sistema como es **hoy**. Se actualiza en el
   mismo commit que la reality que describe.
4. **`npm run docs:check` debe pasar antes de cualquier commit de
   docs.** El script valida 7 invariantes (numeración, secciones,
   status cruzados, links, markers, scopes).

## 5. Consecuencias

Positivas:

- Cada feature tiene un spec trazable de por qué existe y qué
  decisión la motivó. Re-litigar la misma pregunta con cada nuevo
  agente de IA se vuelve la excepción, no la norma.
- El `ROADMAP.md` se convierte en una tabla de 15 filas con status
  enum (no emojis), cada una con link a su spec.
- El `BITACORA.md` se convierte en `docs/progress.md` con la misma
  tabla de envíos del proyecto gemelo.
- Cualquier cambio al flujo (numeración, secciones, reglas) se
  hace en un ADR + governance, no en código disperso.

Negativas:

- Costo inicial de la migración: ~25 archivos tocados, ~6 ADRs
  fundacionales, 1 script nuevo. Mitigación: la wave se hace una
  sola vez y queda blindada.
- Fricción para features triviales: el umbral de 4 secciones mínimas
  puede sentirse pesado para un fix pequeño. Mitigación: el check
  script tolera las 9 secciones restantes como "Pendiente de
  detallar" hasta que se necesite.

Reversibilidad: media. La estructura de `docs/` se puede consolidar
o dividir sin reescribir specs. El flujo (spec → plan → código →
update) es el corazón y no se revierte sin una alternativa.
