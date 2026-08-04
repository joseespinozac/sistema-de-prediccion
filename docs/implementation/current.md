# Implementation Plan — Current

> **Status:** `none`
> **Updated:** 2026-08-04

No wave is currently active. The previous wave (DDD-adoption) shipped
as `v0.1.0` on 2026-08-04 (merge commit `74c6fc8`); the plan is
archived at
[`archive/v0.1.0-shipped-2026-08-04.md`](archive/v0.1.0-shipped-2026-08-04.md).

## Next candidate

See [`docs/roadmap.md`](../roadmap.md) for the list of pending
features. The next wave will be picked by the owner (not by the
agent) based on business priorities and dependencies between
features. Likely candidates:

- **R-002** — registro de precisión del modelo (S, bloquea R-011).
- **R-003** — publicar OAuth (S, bloqueada en decisión de negocio
  sobre Workspace).
- **R-005** — migración a Postgres + hosting (M, última gran pieza
  pre-producción).
- **R-004** — canal de entrega del reporte (M, depende de la
  decisión de canal).

To start a new wave:

1. Create (or copy this template to) `docs/implementation/v<X>.<Y>.md`
   with the atomic tasks for the wave.
2. Add an entry to `Active waves` in this file referencing the
   new `v<X>.<Y>.md`.
3. Update this file's `Status: none` → `Status: active`.
4. Update `docs/roadmap.md` to move the relevant R-NNN rows to
   `in_progress`.
