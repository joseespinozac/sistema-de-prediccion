# Feature Spec — narracion-llm

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend
> **Depends on:** R-001 validar (necesita uso real del detector de
> patrones para evaluar si el LLM aporta)
> **Roadmap:** [R-010](../roadmap.md)

---

## 1. Resumen

En vez de (o además de) las plantillas fijas de R-001, tomar los
**episodios ya detectados por las reglas** (fechas, tipo,
magnitud, evento relacionado) y pedirle a un LLM que los redacte
en un párrafo más natural y variado — nunca que invente o
recalcule los números.

## 2. Problema

Las plantillas de R-001 son funcionales pero repetitivas. Un LLM
pequeño (Claude Haiku o equivalente) puede redactar el mismo
contenido en prosa más natural sin inventar datos.

## 3. Objetivos

- [ ] Usar la API de Anthropic (variable `ANTHROPIC_API_KEY`).
- [ ] Prompt restringe explícitamente al modelo a usar SOLO los
  episodios pre-calculados por R-001.
- [ ] Cachear el texto generado por episodio (no regenerarlo en
  cada carga).
- [ ] Mostrar el texto con un indicador visible de "texto
  generado por IA".

## 4. Casos de uso

- **CU-LLM-01.** Editor abre el dashboard con rango de 90 días
  → "Analizar patrones" → recibe el resumen de R-001 con prosa
  generada por LLM (no por plantillas).
- **CU-LLM-02.** Tooltip en el resumen explica que el texto fue
  generado por IA y que los datos base son determinísticos.

## 5. Requisitos funcionales

- **RF-1.** Tras la detección de R-001, se envía al LLM un JSON
  con el array de episodios + eventos cruzados.
- **RF-2.** Prompt restrictivo: "Usa SOLO estos episodios para
  redactar. No inventes datos ni eventos. Si la lista está
  vacía, di 'No se detectaron patrones significativos'."
- **RF-3.** Texto se guarda junto al snapshot del reporte (en
  `report_snapshots.payload`) o en una tabla nueva
  `pattern_summaries`.
- **RF-4.** Indicador UI visible: "Generado por IA · datos
  verificados".

## 6. Requisitos no funcionales

- **RNF-1.** Latencia añadida ≤ 2s (modelo Haiku).
- **RNF-2.** Costo por generación ≤ $0.001 USD (texto corto,
  input estructurado).

## 7. Cambios al modelo de datos

Pendiente de detallar. Opción A: añadir columna a
`report_snapshots`. Opción B: tabla nueva
`pattern_summaries (id, account_id, periodo_inicio, periodo_fin,
resumen_llm, generado_en)`.

## 8. Cambios de API

Pendiente de detallar. Opción A: el endpoint de patterns devuelve
ambos (plantilla + LLM). Opción B: endpoint separado
`/api/accounts/:id/patterns/llm`.

## 9. Cambios UI

Pendiente de detallar. Indicator badge + tooltip.

## 10. Riesgos

- **Riesgo 1.** El LLM inventa datos. Mitigación: prompt
  restrictivo + validación post-generación (regex sobre números
 出现在了 el resumen).
- **Riesgo 2.** Costo mensual alto si se regenera por visita.
  Mitigación: cache obligatorio.
- **Riesgo 3.** Latencia > 2s degrada UX. Mitigación: el
  resumen LLM se carga async (skeleton primero, luego LLM).

## 11. Casos borde

- **API key no configurada** → fallback al texto de plantilla,
  sin error visible.
- **LLM timeout** → fallback al texto de plantilla, loggear
  warning.

## 12. Definition of Done

- [ ] Spec aprobada.
- [ ] Feature flag activo por defecto `false` (opt-in).
- [ ] Al menos 5 prompts probados para verificar que el LLM no
  inventa.
- [ ] Cache funciona (segunda carga no regenera).
- [ ] Costo medido en 1 semana de uso < $1 USD.
- [ ] `docs/design-document.md` actualizado.
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **R-001 detector patrones** — usa su mismo output, no la
  reemplaza.
- **`alerts`** — la narración LLM no afecta a las alertas
  generadas por reglas.
