# Feature Spec — deteccion-anomalias-tiempo-real

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend
> **Depends on:** *none*
> **Roadmap:** [R-006](../roadmap.md)

---

## 1. Resumen

Hoy las alertas solo se generan cuando se corre una predicción
manualmente o vía el cron del reporte periódico. Esta feature
dispara una alerta en el momento en que el tráfico real se desvía
significativamente de lo predicho, sin esperar al reporte
programado.

## 2. Problema

El objetivo #1 del proyecto es anticipar sorpresas. El cron
diario introduce un retraso de hasta 24h entre "el tráfico ya
cayó" y "el equipo se entera". Esto va contra el objetivo
mismo.

## 3. Objetivos

- [ ] Comparar tráfico real nuevo contra `predictions` ya
  guardadas de forma continua.
- [ ] Disparar alerta cuando el real se desvía de lo predicho
  por encima de un umbral configurable.
- [ ] Throttle: máximo 1 alerta por cuenta/métrica por ventana
  configurable.

## 4. Casos de uso

- **CU-ANM-01.** Llega la ingesta de hoy con -40% vs. yhat → se
  dispara alerta inmediatamente, sin esperar al cron.
- **CU-ANM-02.** La alerta se ve en el panel de alertas activas
  al refrescar el dashboard.

## 5. Requisitos funcionales

- **RF-1.** Hook en el flujo de ingesta (`backend/services/ingest.js`)
  que, después de guardar las filas de hoy, busca la predicción
  correspondiente y compara.
- **RF-2.** Si la desviación supera `ANOMALY_THRESHOLD` (env var,
  default 0.25), crea una fila en `alerts` con `origen:
  'tiempo_real'` (campo nuevo, nullable).
- **RF-3.** Throttle: no se crea alerta si ya hay una del mismo
  `account_id + métrica` en las últimas 24h con `origen:
  'tiempo_real'`.

## 6. Requisitos no funcionales

- **RNF-1.** Latencia añadida a la ingesta ≤ 50ms (la comparación
  es un SELECT simple).
- **RNF-2.** Si la comparación falla (predicción no encontrada),
  se loggea pero no se rompe la ingesta.

## 7. Cambios al modelo de datos

| Tabla | Operación | Detalle |
|---|---|---|
| `alerts` | ALTER | Añadir `origen` (`cron` \| `tiempo_real`, default `cron`) |

## 8. Cambios de API

Sin cambios (las alertas existentes ya se listan en
`/api/alerts`).

## 9. Cambios UI

Opcional: badge "tiempo real" vs "cron" en el panel de alertas
para distinguir el origen.

## 10. Riesgos

- **Riesgo 1.** Comparar predicciones viejas (de hace > 7 días)
  introduce falsos positivos. Mitigación: solo comparar contra
  predicciones con `fecha_generación <= ahora - 1 día` y
  `fecha_predicha >= ahora - 7 días`.
- **Riesgo 2.** Pico de actividad (campaña, viral) dispara falsa
  alerta. Mitigación: el umbral es configurable y se ajusta con
  uso real.

## 11. Casos borde

- **Sin predicción previa** para esa métrica/cuenta → no se
  crea alerta (loggear como info).
- **Múltiples ingestas en el mismo día** → solo se compara
  contra la última ingesta del día.

## 12. Definition of Done

- [ ] Hook en ingesta implementado.
- [ ] Migración de la columna `origen` aplicada.
- [ ] Al menos 1 alerta de tiempo real generada con datos
  sintéticos.
- [ ] Throttle verificado (no spam de alertas en corrida
  consecutiva).
- [ ] `docs/design-document.md` actualizado (mención del origen).
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`alerts`** — extiende el modelo + el endpoint existente.
- **R-009 notificaciones Slack** — se beneficia del mismo
  disparador. Coordinar.
- **`ingest`** — punto único de integración para todo lo que
  llega en tiempo real.
