# ADR-005 — Two-branch model: `development` and `production`

> **Date:** 2026-08-04
> **Status:** accepted

---

## 1. Contexto

Este proyecto es una herramienta interna para el equipo SEO de E3,
de tamaño y superficie mucho menor que
`sistema-control-de-inventarios`. Hoy no hay un repositorio git
inicializado: el código vive en文件系统 sin tracking, lo cual ya
es un riesgo operativo (no hay historial, no hay forma de
revertir, no hay collaboration real entre agentes).

El proyecto gemelo usa un modelo de 4 branches
(`development` → `testing` → `stage` → `production`) alineado con
4 environments; esa decisión está documentada en su `ADR-011`.

## 2. Problema

¿Qué modelo de branching adoptar? Las opciones son:

1. Replicar las 4 branches del proyecto gemelo.
2. Adoptar 2 branches (`development` + `production`).
3. Trunk-based con feature flags.

## 3. Alternativas

### A. 4 branches (development / testing / stage / production)

Replicar exactamente el flujo del proyecto gemelo.

**Pro:** Consistencia entre proyectos. Familiar para quien venga
del gemelo.
**Contra:** No hay hoy un servidor `testing` ni `stage`
configurado; el overhead de mantener 2 branches y 2 deploys más
no se justifica para el tamaño del proyecto. Añade fricción sin
beneficio operacional real.

### B. 2 branches (development, production)

Una branch de trabajo diario + una branch de release.

**Pro:** Refleja la realidad operativa (1 dev local + 1
producción cuando exista hosting). Menos fricción de PR. Menos
confusión sobre "dónde se deploya esto". Onboarding trivial.
**Contra:** Todo lo que va a producción pasa por `development` +
un solo salto; sin buffer de QA formal. Si el proyecto crece
(multi-cliente, hosting con replicas), el modelo puede quedar
corto.

### C. Trunk-based con feature flags

Una sola branch principal + feature flags para trabajo en
progreso.

**Pro:** Flujo más moderno. Deploys desacoplados de releases.
**Contra:** Requiere infraestructura de feature flags que el
proyecto no tiene. Sobre-ingeniería para el estado actual. El
equipo de SEO no tiene la disciplina operativa de toggle
production flags.

## 4. Decisión

**Adoptar opción B.** Dos branches, promoción simple:
`development` → `production` vía PR.

Reglas:

1. **`development` es la branch por defecto y la de trabajo
   diario.** Todo commit que no sea hotfix va aquí primero.
2. **`production` solo recibe PRs mergeados desde `development`.**
   Ningún commit directo a `production` (salvo el seed inicial
   en esta primera inicialización).
3. **`main` no existe.** Decisión explícita: el "main"
   conceptual es `development`; lo que está vivo es lo que se
   está construyendo. Si en el futuro se quiere introducir
   `main`, es un nuevo ADR.
4. **Todo commit a `production` lleva un tag semántico
   (`vX.Y.Z`).** El mensaje del tag lista las features
   enviadas.
5. **`production` tiene branch protection en GitHub:** requiere
   PR + 1 review, prohíbe force-push, prohíbe borrado.
   Configurar en los settings del repo (no en código).
6. **Hotfixes:** branch `hotfix/<slug>` desde `production` → PR
   a `production` → tag → back-merge PR de `production` a
   `development`. Mismo flujo que el proyecto gemelo.
7. **No hay `testing` ni `stage`.** El QA es manual sobre la
   cuenta demo (`demo@e3.com`). Cuando el proyecto tenga hosting
   de QA formal, se introduce `testing` con un nuevo ADR.

## 5. Consecuencias

Positivas:

- Refleja la realidad operativa del proyecto: 1 dev + 1
  producción, sin entornos intermedios ficticios.
- Onboarding trivial: una sola regla de promotion.
- El tag semántico en cada merge a `production` da un historial
  auditable de qué está realmente en producción.
- La protección de `production` evita accidents (force-push,
  borrado accidental) sin agregar fricción al trabajo diario
  (que ocurre en `development`).

Negativas:

- Sin QA formal pre-producción. Mitigación: el `npm run
  docs:check` + el smoke test del flujo OAuth antes de cada
  promoción. El log de `report_snapshots` detecta regresiones
  obvias.
- Si el proyecto crece (multi-cliente, hosting con replicas),
  este modelo puede quedar corto. Mitigación: ADR-005b futuro.

Reversibilidad: alta. Pasar a 3 o 4 branches después es un nuevo
ADR. La protección de branches y los tags son compatibles con el
cambio.
