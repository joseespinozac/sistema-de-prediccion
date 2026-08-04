# Feature Spec — ajuste-umbrales

> **Status:** `deferred`
> **Version target:** continuo (no es un hito único)
> **Owner:** backend + ops
> **Depends on:** uso real
> **Roadmap:** [R-008](../roadmap.md)

---

## 1. Resumen

Calibración continua de los umbrales del sistema con datos reales
del primer ciclo de uso: `ALERT_DROP_THRESHOLD`, `MIN_HISTORY_DAYS`,
`PATTERN_DROP_THRESHOLD`, `PATTERN_BASELINE_WEEKS`,
`PATTERN_RECOVERY_BAND`.

## 2. Problema

Los umbrales documentados en el plan original son puntos de
partida, no decisiones cerradas. Ya hay evidencia (R-001 detector
de patrones con la cuenta "Empeño Facil") de que 0.20 es
demasiado sensible para sitios con volatilidad real alta.

## 3. Objetivos

- [ ] Documentar en `progress.md` cada ajuste de umbral con
  fecha, valor anterior, valor nuevo, y razón.
- [ ] Revisar umbrales después de 30 / 60 / 90 días de uso real.
- [ ] No hacer commits solo-de-configuración sin evidencia.

## 4. Casos de uso

- **CU-CAL-01.** Equipo nota en retrospectiva que las alertas
  generaron mucho ruido durante X → propone subir
  `ALERT_DROP_THRESHOLD` de 0.15 a 0.20 + actualiza `.env.example`
  + commit + entrada en `progress.md`.

## 5. Requisitos funcionales

- **RF-1.** Cada umbral vive en env var (no hardcoded).
- **RF-2.** Cambio de umbral se hace via `.env` + restart +
  commit de `.env.example` documentando el nuevo default.
- **RF-3.** El changelog de umbrales vive en `progress.md` (no en
  un archivo separado).

## 6. Requisitos no funcionales

- **RNF-1.** Cada cambio de umbral debe pasar por la revisión
  del equipo antes de aplicarse a producción.

## 7. Cambios al modelo de datos

Sin cambios.

## 8. Cambios de API

Sin cambios.

## 9. Cambios UI

Sin cambios.

## 10. Riesgos

- **Riesgo 1.** Subir un umbral demasiado → perderse alertas
  reales. Mitigación: revisión trimestral con histórico de
  alertas generadas vs. eventos reales.
- **Riesgo 2.** Conflicto entre lo que un usuario quiere
  (`ALERT_DROP_THRESHOLD=0.10` para su sitio conservador) y el
  default global. Mitigación v2: umbrales por cuenta, no
  globales.

## 11. Casos borde

- **Sitio con 0 variabilidad histórica** → umbrales bajos (0.10)
  son apropiados; cualquier desviación es significativa.
- **Sitio con >50% volatilidad semanal** → umbrales altos
  (0.30+); sino todo se vuelve alerta.

## 12. Definition of Done

- [ ] Primera revisión de umbrales ejecutada después de 30 días
  de uso real (al menos 1 cuenta real activa).
- [ ] Cada ajuste documentado en `progress.md`.
- [ ] `.env.example` actualizado con el nuevo default.

## 13. Impacto sobre otras funcionalidades

- **`alerts`** — depende del umbral.
- **`patterns`** — depende del umbral.
- **R-002 registro precisión** — dará la data para informar los
  próximos ajustes.

---

> **Nota:** Este spec no tiene `target_version` propio porque la
> calibración es continua, no un release. Las entradas de
> `progress.md` se siguen acumulando en v0.x.
