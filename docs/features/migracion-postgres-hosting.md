# Feature Spec — migracion-postgres-hosting

> **Status:** `pending`
> **Version target:** v1.0
> **Owner:** infra + backend
> **Depends on:** *none*
> **Roadmap:** [R-005](../roadmap.md)

---

## 1. Resumen

Migración de SQLite a Postgres (Neon) y elección de hosting
definitivo para Node + Python (candidato actual: Render).
Definido originalmente como Fase 5 del plan.

## 2. Problema

SQLite es aceptable para desarrollo en local pero tiene límites
operacionales reales cuando el producto crece:

- 1 writer a la vez (problema si hay > 1 instancia del backend).
- Sin replicación nativa (riesgo de pérdida de datos si el
  notebook se rompe).
- Sin acceso concurrente por procesos múltiples.

Postgres resuelve todo eso y Sequelize permite el salto cambiando
solo el `dialect`.

## 3. Objetivos

- [ ] Cambiar `dialect` de Sequelize a `postgres`.
- [ ] Definir `DATABASE_URL` (variable de entorno).
- [ ] Correr migraciones contra Postgres.
- [ ] Levantar Node + Python en hosting definitivo.
- [ ] Validar que el flujo completo (login → import → predict →
  alert) funciona en producción con cuentas reales.

## 4. Casos de uso

- **CU-MIG-01.** Editor entra al dashboard en hosting → ve sus
  cuentas conectadas con histórico (BD migrada).
- **CU-MIG-02.** El cron de reporte corre en el hosting cada día
  → guarda snapshots en Postgres.

## 5. Requisitos funcionales

- **RF-1.** `backend/db/index.js` (config Sequelize) detecta el
  dialect por env var.
- **RF-2.** Variables de entorno documentadas:
  `DATABASE_URL`, opcionalmente `DB_HOST`, `DB_PORT`, `DB_USER`,
  `DB_PASSWORD`, `DB_NAME`.
- **RF-3.** Migraciones se corren tal cual (Sequelize es
  dialect-agnostic en migraciones, salvo tipos específicos).
- **RF-4.** Documentar el backup/restore del Postgres.

## 6. Requisitos no funcionales

- **RNF-1.** El cambio de dialect debe ser **rollback-able** en
  minutos si Postgres da problemas.
- **RNF-2.** Hosting elegido debe soportar HTTPS automático.

## 7. Cambios al modelo de datos

Sin cambios para SQLite → Postgres (Sequelize abstrae los tipos
comunes). Salvedad: columnas `INTEGER.UNSIGNED` (si las hay) no
existen en Postgres — se cambian a `INTEGER`. En este proyecto no
se encontraron al hacer la revisión previa a la migración DDD.

## 8. Cambios de API

Sin cambios visibles.

## 9. Cambios UI

Sin cambios.

## 10. Riesgos

- **Riesgo 1.** Hosting gratuito tiene límites (sleep after
  inactividad, plan free tier). Mitigación: evaluar tier pago si
  el uso real lo amerita.
- **Riesgo 2.** Pérdida de datos en migración. Mitigación: backup
  completo pre-migración + verificación post-migración.

## 11. Casos borde

- **SQLite local + Postgres en prod** → mantener ambos
  paths en `backend/db/index.js` durante la transición.
- **Prophet no compila en el build del hosting** → fallback ya
  implementado (motor de respaldo sin Prophet).

## 12. Definition of Done

- [ ] `DATABASE_URL` documentado y funcionando en local con
  Postgres.
- [ ] Hosting elegido + cuentas creadas.
- [ ] Deploy exitoso.
- [ ] Smoke test end-to-end desde la app pública contra el
  Postgres del hosting.
- [ ] `docs/design-document.md` actualizado.
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **Todo el sistema** — el cambio de BD es transversal.
- **ADR-004 periodic jobs** — el job de reporte ahora corre en el
  hosting. Asegurar que el runner (`npm run jobs:run`) funciona
  en el entorno del hosting.
