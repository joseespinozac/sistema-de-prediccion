# Feature Spec — historial-precision-modelo

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend + frontend
> **Depends on:** R-002 registro de precisión
> **Roadmap:** [R-011](../roadmap.md)

---

## 1. Resumen

Panel en el dashboard que muestra "de las predicciones que
hicimos hace N días, ¿qué tan cerca estuvieron del valor real
observado?". Permite al equipo validar si el modelo (Prophet o el
motor de respaldo) es confiable.

## 2. Problema

Sin este panel, no hay forma objetiva de saber si Prophet está
aportando valor o si el motor de respaldo es suficiente. La
decisión de mantener Prophet (vs. simplificar el stack) no se
puede tomar sin datos.

## 3. Objetivos

- [ ] Gráfica de líneas: error absoluto por predicción a lo
  largo del tiempo.
- [ ] Tabla con las últimas N predicciones + MAPE / RMSE.
- [ ] Filtros por cuenta + métrica.
- [ ] Indicador "confianza histórica" (alto / medio / bajo).

## 4. Casos de uso

- **CU-HPR-01.** Editor entra al panel de precisión → ve que las
  predicciones de GA4 sesiones tienen MAPE 12% en el último mes
  vs. 18% en GSC clics → decide mantener ambos en el stack.

## 5. Requisitos funcionales

- **RF-1.** Endpoint `GET /api/accounts/:id/model-precision`
  devuelve: `{ metric, mape, rmse, predictions[] }`.
- **RF-2.** Calcular MAPE solo sobre predicciones con
  `valor_real` no nulo (ignorar las que aún no llegaron a su
  fecha predicha).
- **RF-3.** Indicador "confianza": MAPE < 10% = alta; 10–20% =
  media; > 20% = baja.

## 6. Requisitos no funcionales

- **RNF-1.** El cálculo corre on-demand (no se cron-ejecuta); la
  query sobre `predictions` es indexada.

## 7. Cambios al modelo de datos

Sin cambios nuevos (R-002 crea las columnas necesarias).

## 8. Cambios de API

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/accounts/:id/model-precision` | Métricas y array de errores |

## 9. Cambios UI

Pendiente de detallar. Sección nueva en `frontend/index.html`
debajo del panel de patrones.

## 10. Riesgos

- **Riesgo 1.** MAPE engañoso con valores reales muy bajos (un
  error absoluto pequeño es un % enorme). Mitigación: mostrar
  también RMSE (no solo MAPE).
- **Riesgo 2.** Datos de GSC con valores muy pequeños (clics
  por URL específica) tienen MAPE alto naturalmente. Mitigación:
  mostrar MAPE solo a nivel de cuenta, no de URL.

## 11. Casos borde

- **0 predicciones con `valor_real`** → mensaje "Aún no hay
  datos suficientes. El cálculo empieza a ser útil después de N
  predicciones evaluadas."

## 12. Definition of Done

- [ ] Endpoint implementado.
- [ ] UI básica con gráfica + tabla.
- [ ] Al menos 1 semana de uso real validando que los números
  son razonables.
- [ ] `docs/design-document.md` actualizado.
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **R-002** — dependencia directa (sin datos no hay panel).
- **R-014 motor sugerencias v2 con LLM** — el LLM podría
  consumir datos de precisión para mejorar sugerencias.
