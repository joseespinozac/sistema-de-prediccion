# Governance — Predictor de Tráfico E3

> **Source of truth** para la disciplina de documentación del proyecto.
> Si una regla de este documento entra en conflicto con cualquier otro,
> este documento gana.
>
> **Audiencia:** todo code agent, developer, reviewer o contributor
> que agregue, edite o elimine funcionalidad en este repo.

---

## 1. Propósito

Cada evolución del sistema debe ser **completamente trazable**. Para
cada pieza de trabajo enviada, debemos poder responder sin grep
arqueológico:

- **¿Por qué** existe esta feature?
- **¿Cuándo** se agregó?
- **¿Qué** cambió (código, esquema, API, UI)?
- **¿Qué documentos** la describen?
- **¿Qué decisión** motivó su implementación?

El costo de una respuesta faltante es un ticket futuro
re-litigando la misma pregunta. Este documento define la disciplina
que previene ese costo.

---

## 2. Principios

1. **No se implementa sin spec aprobado.** Una feature vive en
   `docs/features/<slug>.md` y tiene al menos las 4 secciones
   mínimas (Resumen, Problema, Objetivos, Definition of Done)
   completas antes de que un plan en `docs/implementation/` la
   pueda referenciar.
2. **El código refleja la documentación.** Si la implementación
   diverge de la spec, o la spec estaba mal (se actualiza
   primero) o el código está mal (se corrige el código). La
   documentación nunca se queda atrás del código en silencio.
3. **La documentación refleja el estado actual.**
   `docs/design-document.md` es la descripción canónica del
   sistema como es **hoy**. Los párrafos desactualizados se
   eliminan o reescriben en el mismo commit que los vuelve
   obsoletos.
4. **Sin documentos monolíticos.** Cuando un documento crece
   hasta el punto de ser doloroso de navegar, se parte por
   responsabilidad. La única excepción es
   `docs/design-document.md` (ver [`ADR-002`](decisions/ADR-002-monolithic-design-doc.md)).
5. **Estructura consistente y fácil de navegar.** El layout en §3
   es el único layout. Nuevos archivos top-level bajo `docs/`
   requieren un ADR (ver [`ADR-001`](decisions/ADR-001-extended-docs-layout.md)).

---

## 3. Layout

```
docs/
├── governance.md                      Estás aquí. Las reglas DDD.
├── design-document.md                 Fuente de verdad del sistema.
├── design-system.md                   UI tokens, componentes, copy.
├── roadmap.md                         Features futuras únicamente.
├── progress.md                        Historial enviado únicamente.
│
├── features/                          Un archivo por feature.
│   ├── _template.md                   Secciones requeridas (ver §6.1).
│   └── <feature-name>.md
│
├── rfcs/                              Un archivo por Request For Comments.
│   ├── _template.md
│   └── RFC-NNN-<title>.md
│
├── decisions/                         Un archivo por ADR.
│   ├── _template.md
│   └── ADR-NNN-<title>.md
│
└── implementation/                    Planes atómicos, uno por wave.
    ├── current.md                     Plan en ejecución ahora.
    ├── v<X>.<Y>.md                    Planes agrupados por versión.
    └── archive/                       Waves ya enviados (read-only).
```

---

## 4. Responsabilidad por documento

| Documento | Contiene | NO contiene |
|---|---|---|
| `governance.md` | Reglas del flujo DDD, layout, validación | Decisiones específicas (viven en ADRs) |
| `design-document.md` | Arquitectura, modelo de datos, reglas de negocio, flujos, APIs, seguridad, componentes | Trabajo futuro, preguntas abiertas, todos |
| `design-system.md` | UI tokens, patrones de componente, reglas de copy | Specs de feature, reglas de negocio |
| `roadmap.md` | Features futuras con prioridad, status, dependencias, target version | Trabajo enviado, trabajo en progreso |
| `progress.md` | Date, version, feature, description, commit, notes | Trabajo pendiente, preguntas abiertas |
| `features/*.md` | Las 13 secciones requeridas (ver §6.1) | Pasos de implementación, referencias a código |
| `rfcs/*.md` | Las 7 secciones requeridas (ver §6.2) | Definición final de API o esquema |
| `decisions/ADR-NNN-*.md` | Contexto, problema, alternativas, decisión, consecuencias | Pasos de implementación |
| `implementation/*.md` | Tareas atómicas con state, priority, scope, files, criterios de aceptación | Rationale arquitectónico (vive en la spec o en el ADR) |

---

## 5. Flujo mandatorio

Cada nueva funcionalidad sigue este lifecycle:

```
        Idea
          ↓
       Roadmap          ← docs/roadmap.md gana una fila
          ↓
         RFC            ← docs/rfcs/RFC-NNN-*.md (solo si el cambio es grande)
          ↓
   Feature Spec         ← docs/features/<name>.md (obligatorio, 13 secciones)
          ↓
  Implementation Plan  ← docs/implementation/v<X>.<Y>.md (tareas atómicas)
          ↓
    Implementation      ← código, esquema, API, UI
          ↓
  Update Design Doc    ← docs/design-document.md refleja la nueva realidad
          ↓
 Register Progress    ← docs/progress.md gana una fila
          ↓
    Close Feature      ← spec status -> "Completed"
```

**El orden no es una sugerencia.** Cada paso es precondición del
siguiente.

---

## 6. Secciones requeridas

### 6.1 Feature spec (`docs/features/<name>.md`)

Las 13 secciones, en este orden:

1. Resumen
2. Problema
3. Objetivos
4. Casos de uso
5. Requisitos funcionales
6. Requisitos no funcionales
7. Cambios al modelo de datos
8. Cambios de API
9. Cambios UI
10. Riesgos
11. Casos borde
12. Definition of Done
13. Impacto sobre otras funcionalidades

**Umbral mínimo para empezar a planear:** las 4 primeras
(Resumen, Problema, Objetivos, Definition of Done) completas.
Las otras 9 pueden empezar con *Pendiente de detallar* y
completarse antes de mover el spec a `in_progress`.

**Status** (en el frontmatter del spec) ∈ `draft` |
`in_progress` | `completed` | `rejected`. Validado por
`npm run docs:check`.

### 6.2 RFC (`docs/rfcs/RFC-NNN-<title>.md`)

Las 7 secciones:

1. ¿Por qué?
2. ¿Qué problema resuelve?
3. Alternativas consideradas
4. Impacto técnico
5. Impacto funcional
6. Riesgos
7. Decisión tomada

Un RFC se requiere cuando el cambio cruza límites de módulo,
altera el modelo de datos de forma no aditiva, cambia una
dependencia fundacional, o afecta APIs consumidas fuera del repo.

### 6.3 ADR (`docs/decisions/ADR-NNN-<title>.md`)

Las 5 secciones:

1. Contexto
2. Problema
3. Alternativas
4. Decisión
5. Consecuencias

Numeración consecutiva desde `000`, con padding de 3 dígitos
(`ADR-000-...`, `ADR-001-...`, etc.). **Sin gaps** — si aparece
un hueco en la secuencia, `npm run docs:check` falla. Ver
[`ADR-001`](decisions/ADR-001-extended-docs-layout.md) para
la regla de nuevos archivos top-level en `docs/`.

---

## 7. Periodic jobs

Los periodic jobs (cron, scheduled exports, reconciliations,
cleanup) **no viven inline en `backend/server.js` ni en el
orquestador del cron**. Cada job es su propio archivo.

Reglas (resumen; el detalle vive en
[`ADR-004`](decisions/ADR-004-periodic-jobs-governance.md)):

1. **Ubicación.** Cada job vive en `backend/jobs/<job-name>.js`
   y exporta una función async `runJobName(): Promise<{ jobName,
   startedAt, finishedAt, durationMs, stats }>`.
2. **Runner.** Los jobs se invocan vía
   `npm run jobs:run <job-name>`. El schedule real (`node-cron`,
   crontab del sistema, Kubernetes `CronJob`) se documenta en
   `AGENTS.md §Periodic jobs`.
3. **Idempotencia.** Todo job es seguro de ejecutar N veces sin
   daño. Las mutaciones usan `WHERE id NOT IN (lo ya procesado)`
   o filtrado equivalente.
4. **Logging estructurado.** Cada job emite JSON con al menos
   `jobName`, `startedAt`, `finishedAt`, `durationMs`, `stats`.

**Estado actual:** `backend/jobs/cron.js` mezcla schedule +
handler + orquestación. La migración al patrón nuevo es
follow-up de esta wave (no parte de la migración DDD).

---

## 8. Reglas de trabajo

Cuando se pida agregar una nueva funcionalidad:

1. **Leer `docs/design-document.md` primero.** Identificar qué
   secciones se ven afectadas.
2. **Detectar áreas impactadas.** Cross-reference con
   `docs/features/`, `docs/decisions/`, y `docs/progress.md`.
3. **Crear o actualizar el feature spec.**
   `docs/features/<name>.md` con las 13 secciones. Hasta un
   cambio chico merece un spec.
4. **Si el cambio es grande, escribir un RFC primero.** En la
   misma carpeta `rfcs/`. El RFC debe llegar a *Decisión tomada*
   antes de que el spec se finalice.
5. **Generar el implementation plan.** Tareas atómicas en
   `docs/implementation/v<X>.<Y>.md` o `current.md` (ver
   [`ADR-003`](decisions/ADR-003-implementation-plan-versioning.md)
   para el versionado por wave). Cada tarea lista state,
   priority, scope, archivos afectados, criterios de aceptación.

   **`v<X>.<Y>.md` es un archivo por wave de release** — no un
   archivo por feature. Una wave = un conjunto coherente de
   features que se envían juntas en el mismo minor version. El
   `target_version` en cada feature spec asigna la feature a su
   wave. La asignación la hace el owner, no el agente (el
   agente propone 2–3 opciones con rationale).

   Cuando una wave se envía, `v<X>.<Y>.md` se mueve a
   `archive/v<X>.<Y>-shipped-<date>.md` y `current.md` se
   resetea a `Status: none`.
6. **Esperar aprobación.** Salvo que la instrucción diga
   explícitamente "implementar", no modificar código. Surface
   el spec + plan y preguntar.
7. **Cuando la implementación termina:**
   - Actualizar `docs/design-document.md` para reflejar la nueva
     realidad.
   - Actualizar `docs/progress.md` con la fila correspondiente
     (date, version, feature, description, commit, notes).
   - Cambiar el status del feature spec a `Completed`.

---

## 9. Verificación

Correr `npm run docs:check` antes de declarar trabajo de
documentación terminado.

El script (`scripts/check-docs.mjs`) verifica:

1. Numeración ADR y RFC consecutiva, sin gaps.
2. Cada `features/*.md` (excepto `_template.md`) tiene las 13
   secciones y un valor de `**Status:**` del conjunto permitido.
3. Features con `status: completed` están referenciadas en
   `docs/progress.md`.
4. Features con `status: in_progress` referencian un plan de
   implementación activo.
5. Las referencias cruzadas entre documentos resuelven (sin
   anclas muertas).
6. `docs/design-document.md` no contiene markers de sprint/task
   legacy.
7. Los scopes de tareas en los implementation plans son válidos
   (∈ `backend`, `frontend`, `prediction-service`, `docs`,
   `deps`, `infra`).

Exit code != 0 significa que hay un defecto de documentación que
hay que arreglar antes de que el commit pueda landed.

---

## 10. Lo que este governance NO reemplaza

- `AGENTS.md` — nav hub para code agents. Lista comandos de
  tools, gotchas conocidos, y links a los docs canónicos.
- `docs/design-system.md` — tokens de UI, patrones de
  componentes, reglas de copy. Referenciado desde
  `docs/design-document.md § Componentes`.

Si una regla parece faltar aquí, revisar esos archivos. Si
genuinamente falta, escribir un ADR proponiendo la nueva regla
antes de aplicarla.
