# Feature Spec — registro-precision-modelo

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend
> **Depends on:** *none*
> **Roadmap:** [R-002](../roadmap.md)

---

## 1. Resumen

Cada vez que se genera una predicción, guardar asociado el valor
real observado para el mismo periodo, **aunque el dashboard de
precisión sea v2**. Sin este registro desde el día uno, no se
podrá construir el historial de precisión del modelo más adelante
(porque el dato no estará ahí).

## 2. Problema

El plan original §8 pedía explícitamente *"guardar desde el día
uno el valor real observado para el mismo periodo que se predijo,
aunque el dashboard sea v2"*. Esto **no se implementó** durante las
Fases 3 y 4. Sin él, el historial de precisión futura depende de
recuperar datos viejos que no se guardaron — no se puede.

El coste de no hacerlo es un gap permanente: cada día que pasa sin
este registro es un día menos de historial para entrenar el
dashboard de R-011 cuando se priorice.

## 3. Objetivos

- [ ] Cuando se genera una predicción, guardar el forecast en
  `predictions` (ya existe) **+** un snapshot del estado real de
  `traffic_snapshots` en el momento de la generación.
- [ ] Cuando la fecha predicha ya pasó, comparar `yhat` vs. valor
  real observado y calcular error (MAPE / RMSE / etc.).
- [ ] Persistir el error por predicción para alimentar el
  dashboard de R-011.
- [ ] Cubrir tanto GA4 (sesiones) como GSC (clics /
  impresiones).

## 4. Casos de uso

- **CU-MTR-01.** Editor genera predicción hoy para horizonte de
  30 días → 30 puntos con `yhat`, `yhat_lower`, `yhat_upper`
  quedan guardados en `predictions`.
- **CU-MTR-02.** 30 días después, el sistema toma el valor real
  de `traffic_snapshots` para esas mismas fechas y calcula el
  error por punto.
- **CU-MTR-03.** Editor abre el dashboard (futuro R-011) y ve
  una gráfica: "error del modelo en las últimas N predicciones" +
  tabla con cada predicción y su error.

## 5. Requisitos funcionales

- **RF-1.** Almacenar por cada predicción: `fecha_predicha`,
  `valor_predicho (yhat)`, `valor_real` (nullable hasta que
  llegue la fecha), `error_absoluto` (nullable), `error_pct`
  (nullable).
- **RF-2.** Job periódico que, para predicciones con fecha
  predicha ya pasada y sin `valor_real`, busca el valor real en
  `traffic_snapshots` y llena `valor_real` + errores.
- **RF-3.** Cobertura de las 3 métricas: clics (GSC),
  impresiones (GSC), sesiones (GA4). Misma métrica usada al
  predecir.
- **RF-4.** No recalcular errores históricos: una vez calculado,
  el valor se congela (auditoría del modelo).

## 6. Requisitos no funcionales

- **RNF-1.** El job de actualización de `valor_real` debe ser
  idempotente y barato (≤ 1s por predicción).
- **RNF-2.** El cálculo de error debe tolerar días sin datos
  reales (fin de semana sin tráfico, dropouts). Estrategia:
  saltar el punto, no marcar como error 100%.

## 7. Cambios al modelo de datos

| Tabla | Operación | Detalle |
|---|---|---|
| `predictions` | ALTER | Añadir columnas `valor_real NUMERIC NULL`, `error_absoluto NUMERIC NULL`, `error_pct NUMERIC NULL` |

## 8. Cambios de API

Sin cambios visibles al cliente en v1.

## 9. Cambios UI

Sin cambios UI en v1 (el dashboard de R-011 lo consumirá).

## 10. Riesgos

- **Riesgo 1.** Lag de ingesta: si `traffic_snapshots` no tiene
  el día predicho (porque la ingesta de GA4/GSC no se ejecutó o
  falló), el `valor_real` queda null indefinidamente. Mitigación:
  el job reintenta periódicamente y loggea las predicciones sin
  match para revisión.
- **Riesgo 2.** Predicciones generadas con series de URL
  específica (no cuenta completa) deben compararse contra el real
  de la misma URL, no contra la cuenta. Mitigación: la métrica
  `scope` (URL vs. cuenta) se preserva en `predictions` y se
  respeta en el join.

## 11. Casos borde

- **Predicción sin URL/query específica** (alcance = cuenta) →
  `valor_real` se suma de todas las filas de `traffic_snapshots`
  para esa cuenta/fecha/métrica.
- **Cambio retroactivo en `traffic_snapshots`** (corrección de
  Google, re-ingesta) → el error ya calculado queda congelado;
  no se recalcula. Documentar en la UI futura qué versión de los
  datos se usó.

## 12. Definition of Done

- [ ] Spec aprobada.
- [ ] Plan de implementación ejecutado.
- [ ] Migración agrega las 3 columnas a `predictions`.
- [ ] Job de backfill implementado en `backend/jobs/`.
- [ ] Job corre al menos 1 vez contra datos sintéticos y llena
  `valor_real` correctamente.
- [ ] `docs/design-document.md` actualizado (§5.6 Motor de
  predicción).
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`predictions`** — extiende el modelo. No rompe clientes
  existentes (columnas nullable).
- **`report-snapshot`** (futuro) — puede incluir precisión
  histórica como KPI opcional.
- **R-011 historial precisión modelo** — depende directamente de
  este spec. Sin R-002, R-011 no tiene datos.
