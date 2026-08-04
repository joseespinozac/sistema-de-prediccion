# ADR-003 — Versionado del implementation plan por release wave

> **Date:** 2026-08-04
> **Status:** accepted

---

## 1. Contexto

`docs/implementation/` es la carpeta donde vive el plan atómico de
implementación. Sin reglas explícitas de versionado, los planes
pueden degenerar de dos formas:

1. **Un solo archivo gigante** que crece con cada feature nueva y
   se vuelve inmanejable en pocas waves.
2. **Un archivo por feature**, que fragmenta la trazabilidad:
   ¿cuál fue el conjunto coherente de features que se enviaron
   juntos en la v1.0? ¿Cuál era el plan en ejecución durante la
   v1.1?

El proyecto gemelo `sistema-control-de-inventarios` resolvió esto
con un modelo de **un archivo por wave de release**, más un
`current.md` que solo referencia waves activos — su propio `ADR-008`
documenta la decisión.

## 2. Problema

¿Qué granularidad debe tener `docs/implementation/`?

## 3. Alternativas

### A. Un solo archivo `current.md` infinito

Todas las tareas atómicas en `current.md`, sin versionar.

**Pro:** Simple, todo en un lugar.
**Contra:** Después de 2–3 waves el archivo es ilegible. No hay
forma de reconstruir qué se planeó vs qué se envió en cada
release.

### B. Un archivo por feature (`plans/<feature>.md`)

Cada feature tiene su propio plan atómico.

**Pro:** Cada plan es pequeño y referenciable individualmente.
**Contra:** Se pierde la noción de "qué features se envían juntas
en esta release". El `progress.md` tiene que reconstruir la
agrupación desde las filas individuales.

### C. Un archivo por wave de release (`v<X>.<Y>.md`) + `current.md`

`current.md` solo referencia waves activos. Cada `v<X>.<Y>.md`
contiene las tareas atómicas de **todas** las features que se
enviaron juntas en ese minor version.

**Pro:** Trazabilidad de release intacta. `current.md` se mantiene
delgado. Las waves cerradas se mueven a `archive/`.
**Contra:** Requiere decidir a priori qué entra en cada wave.

## 4. Decisión

**Adoptar opción C.** Un `v<X>.<Y>.md` por wave de release, no un
archivo por feature.

Reglas:

1. **`current.md` es el índice de waves activos.** Lista qué waves
   están en ejecución y enlaza a su `v<X>.<Y>.md`.
2. **`v<X>.<Y>.md` agrupa las tareas atómicas de todas las features
   que se envían juntas en ese minor version.** Criterios para
   incluir una feature en una wave:
   - Mismo nivel de madurez que las otras features de la wave.
   - Sin dependencia bloqueante con features ya en la wave.
   - Cabe en un sprint del equipo.
3. **Cuando una wave se envía**, su `v<X>.<Y>.md` se mueve a
   `docs/implementation/archive/v<X>.<Y>-shipped-<date>.md` y
   `current.md` se actualiza a `Status: none` (o al siguiente
   wave activo).
4. **La asignación de `target_version` en una feature spec es
   decisión del owner**, no del agente. El agente propone 2–3
   opciones con rationale; el owner elige.
5. **No existe "1 feature por version"** salvo que la feature sea
   un release en sí misma (e.g. una migración con breaking change).

## 5. Consecuencias

Positivas:

- Trazabilidad histórica de qué se planeó y qué se envió en cada
  release, sin grep arqueológico.
- `current.md` se mantiene legible siempre (solo lista waves
  activos, no tareas).
- Una wave grande con 5 features no se fragmenta en 5 archivos
  sueltos; vive en un solo `v<X>.<Y>.md` que cuenta la historia
  completa de ese release.

Negativas:

- Hay que decidir a priori qué features van juntas. Si una feature
  se atrasa, hay que moverla a la wave siguiente con un commit de
  reasignación.
- Mitigación: el threshold de "mismo nivel de madurez" y "cabe en
  un sprint" es explícito, no vago.

Reversibilidad: alta. Cambiar a "1 archivo por feature" es un
nuevo ADR; las waves ya enviadas quedan en `archive/` para
referencia histórica.
