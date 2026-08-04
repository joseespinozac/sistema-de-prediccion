# Feature Spec — motor-sugerencias-llm

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend
> **Depends on:** R-001 validar (sugerencias de reglas en uso real)
> **Roadmap:** [R-014](../roadmap.md)

---

## 1. Resumen

Hoy las sugerencias de acción preventiva son reglas fijas (caída
+ update reciente → "auditoría de contenido", etc.). La v2 usaría
un LLM para generar sugerencias más específicas y contextuales,
considerando más señales a la vez (alertas múltiples, eventos,
predicciones).

## 2. Problema

Las reglas fijas son seguras pero genéricas. Un LLM con acceso a
los mismos datos puede proponer acciones más concretas (ej.
"actualizar contenido X con la keyword Y" vs. "auditar contenido").

## 3. Objetivos

- [ ] Usar la API de Anthropic (misma que R-010).
- [ ] Input estructurado: alertas activas + eventos + (opcional)
  top URLs afectadas.
- [ ] Output: 2-3 sugerencias ordenadas por relevancia.
- [ ] Indicador UI: "sugerencia generada por IA".

## 4. Casos de uso

- **CU-SUG-01.** Editor ve una alerta de caída → en vez del texto
  fijo "auditar contenido", ve 3 sugerencias específicas:
  "Revisar [URL1] (perdió 60% clics)", "Actualizar metadescripción
  de [URL2]", "Validar indexación de [URL3] en Search Console".

## 5. Requisitos funcionales

- **RF-1.** Cuando se crea una alerta, en paralelo al texto de
  regla, se llama al LLM con el contexto completo.
- **RF-2.** Sugerencias se guardan en `alerts.sugerencia_llm`
  (TEXT o JSON).
- **RF-3.** La UI muestra ambas: la regla (auditable) primero, la
  sugerencia LLM después (con badge "IA").

## 6. Requisitos no funcionales

- **RNF-1.** Latencia ≤ 2s; en paralelo con el resto del flujo.
- **RNF-2.** Las reglas fijas siguen siendo el **fallback** si el
  LLM no responde.

## 7. Cambios al modelo de datos

| Tabla | Operación | Detalle |
|---|---|---|
| `alerts` | ALTER | Añadir `sugerencia_llm TEXT NULL` |

## 8. Cambios de API

Sin cambios visibles (campo nuevo, opcional).

## 9. Cambios UI

Pendiente. Badge "IA" + collapsible para mostrar/ocultar la
sugerencia LLM.

## 10. Riesgos

- **Riesgo 1.** LLM sugiere acciones que no aplica al sitio
  concreto. Mitigación: prompt restrictivo pide al LLM que solo
  use las URLs/queries que perdió tráfico, sin inventar.
- **Riesgo 2.** Costo de LLM por alerta generada. Mitigación:
  solo llamar al LLM para alertas `severidad IN ('alta')`, no
  para todas.

## 11. Casos borde

- **LLM no configurado o caído** → fallback al texto de regla.
- **Alerta sin URLs afectadas** (caída a nivel cuenta) → el
  prompt incluye "sugiere acciones a nivel agregado".

## 12. Definition of Done

- [ ] Spec aprobada (especificar con detalle el prompt).
- [ ] Feature flag `SUGERENCIAS_LLM_ENABLED=false` por defecto.
- [ ] Al menos 10 alertas generadas con sugerencias LLM
  evaluadas manualmente por el equipo.
- [ ] Costo promedio por alerta < $0.005 USD.
- [ ] `docs/design-document.md` actualizado (§5.4 en
  "Proceso interno").
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`alerts`** — extiende el modelo.
- **R-010 narración LLM** — comparte API key e infraestructura.
