# Feature Spec — detector-patrones-v1

> **Status:** `completed`
> **Version target:** v0.0.0
> **Owner:** backend + frontend
> **Depends on:** *none*
> **Roadmap:** [R-001](../roadmap.md)

---

## 1. Resumen

Detector de patrones automático para el dashboard: agrega el tráfico
en semanas de calendario, las compara contra una línea base móvil
de 8 semanas anteriores, detecta episodios de **caída**, **pico**,
**recuperación** y **tendencia sostenida**, los cruza con
`external_events` ya registrados, y los narra en español por
plantillas (sin LLM en v1).

## 2. Problema

Antes de esta feature, la única forma de detectar un patrón de
tráfico era mirar la gráfica manualmente. Eso dependía de que
alguien del equipo lo notara a tiempo — exactamente el caso que el
proyecto busca evitar (objetivo #1 del plan original: anticipar
sorpresas en caídas).

## 3. Objetivos

- [x] Backend: motor de detección de episodios semanales.
- [x] API: `GET /api/accounts/:id/patterns?start=&end=` que
  devuelve el resumen narrativo + array de episodios.
- [x] Frontend: botón "Analizar patrones" en el dashboard.
- [x] Frontend: panel con resumen narrativo + lista de episodios
  con tipo (caída/pico), magnitud, fechas y flag de recuperado.
- [x] Calibración de umbrales configurable vía env vars.
- [x] Verificación con 2 datasets reales (cuenta demo sintética +
  cuenta real "Empeño Facil").

## 4. Casos de uso

- **CU-DET-01.** Editor abre el dashboard con un rango de 90 días
  → hace click en "Analizar patrones" → recibe un párrafo en
  español listando los episodios detectados (caída, pico,
  recuperación, tendencia sostenida), con magnitud y referencia a
  cualquier `external_event` cercano.
- **CU-DET-02.** Editor nota una "caída en mayo" en el resumen →
  click en la fecha del episodio de la lista → ve el periodo
  exacto en la gráfica.
- **CU-DET-03.** Editor quiere recalibrar umbrales → modifica
  `PATTERN_DROP_THRESHOLD` (ej. 0.30 en vez de 0.20) y vuelve a
  correr.

## 5. Requisitos funcionales

- **RF-1.** El agregador toma `traffic_snapshots` para una cuenta y
  rango, los suma por **semana de calendario** (lunes a domingo),
  en huso horario local del navegador (todo el rango igual para
  evitar artefactos de zona horaria en semanas parciales).
- **RF-2.** Para cada semana calculada se computa una **línea base
  móvil** = promedio de las 8 semanas anteriores en el rango
  (excluyendo la semana actual). Configurable vía
  `PATTERN_BASELINE_WEEKS`.
- **RF-3.** Se compara el promedio real de la semana contra la
  línea base → se calcula el **% de desviación**.
- **RF-4.** Si la desviación supera `PATTERN_DROP_THRESHOLD`
  (±0.20 por defecto) la semana se marca como **caída** o **pico**
  según el signo.
- **RF-5.** Si una semana marcada vuelve a estar dentro de una
  banda pequeña (±10%) se marca como **recuperación** (o
  "normalización" para un pico).
- **RF-6.** Semanas consecutivas del mismo tipo se **fusionan** en
  un solo **episodio** con `fecha_inicio`, `fecha_fin` y magnitud
  (promedio del bloque).
- **RF-7.** Si un episodio de caída no se recupera en varias
  semanas, se reclasifica como **tendencia sostenida** (no
  "caída puntual"). El campo `sostenido: true` lo señala.
- **RF-8.** Cada episodio se cruza con `external_events` cuya
  fecha esté en una ventana de ±7 días (configurable). Si hay
  coincidencia, el evento se menciona en el texto del resumen.
- **RF-9.** Los episodios se redactan con **plantillas fijas en
  español** (no LLM en v1) y se concatenan en un párrafo único,
  ordenados cronológicamente.

## 6. Requisitos no funcionales

- **RNF-1.** Tiempo de respuesta del endpoint ≤ 1s para un rango
  de 365 días.
- **RNF-2.** El motor debe ser **idempotente**: misma serie +
  mismos eventos → mismo resumen. Sin estado, sin timestamps
  ocultos.
- **RNF-3.** El resumen es texto plano en español (es-MX),
  redactado para un lector humano. Sin jerga interna.
- **RNF-4.** La narración no inventa datos. Solo usa los
  episodios detectados y los eventos cruzados.

## 7. Cambios al modelo de datos

Sin cambios. El detector lee `traffic_snapshots` y
`external_events` existentes.

## 8. Cambios de API

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/accounts/:id/patterns?start=&end=` | Devuelve `{ resumen, episodios, stats }` |

**Ejemplo de respuesta:**

```json
{
  "resumen": "El tráfico cayó un -28% la primera semana de mayo...",
  "episodios": [
    {
      "tipo": "caida",
      "desde": "2026-05-04",
      "hasta": "2026-05-10",
      "magnitud_pct": -28,
      "sostenido": false,
      "recuperado": true,
      "evento_relacionado": { "fecha": "2026-05-07", "tipo": "update_google", "descripcion": "Core Update" }
    }
  ],
  "stats": {
    "semanas_analizadas": 12,
    "episodios_detectados": 3,
    "eventos_cruzados": 1
  }
}
```

## 9. Cambios UI

- `frontend/index.html` — botón "Analizar patrones" en la sección
  de controles del dashboard (después del botón "Generar
  predicción").
- `frontend/index.html` — nueva sección "Resumen de patrones
  (semanal)" debajo de la gráfica; muestra el párrafo narrativo y
  la lista de episodios como filas con badge de tipo + magnitud +
  periodo.
- `frontend/js/dashboard.js` — nuevos campos en el state Alpine:
  `patternsResumen`, `patternsEpisodios`, `analyzingPatterns`. Nuevos
  métodos: `analyzePatterns()`.

## 10. Riesgos

- **Riesgo 1.** Umbrales demasiado sensibles → muchos falsos
  positivos. Mitigación: umbrales configurables vía env vars
  (`PATTERN_DROP_THRESHOLD`, `PATTERN_BASELINE_WEEKS`,
  `PATTERN_RECOVERY_BAND`). Verificado en datos reales — el
  umbral 0.20 resultó demasiado sensible para la volatilidad de
  "Empeño Facil". Documentado en `docs/roadmap.md` R-008
  (calibración continua).
- **Riesgo 2.** El parser de fechas cae en semana parcial al
  borde del rango. Mitigación: el agregador descarta la primera
  y última semana si están incompletas (heurística: <4 días).
- **Riesgo 3.** El motor puede inventar narrativas que no se
  sostienen en datos. Mitigación: las plantillas referencian
  magnitudes, fechas y eventos **exactos**. No hay generación
  creativa. La v2 con LLM sevalida explícitamente que el modelo
  no invente.

## 11. Casos borde

- **Rango < 9 semanas.** El motor rechaza y devuelve `{ resumen:
  "Necesitas al menos 9 semanas de histórico para detectar
  patrones.", episodios: [] }`.
- **0 eventos externos.** Los episodios no mencionan eventos; el
  resumen sigue funcionando con plantillas de causa desconocida.
- **Tendencia sostenida + nuevo evento durante la caída.** Se
  menciona el evento, pero la clasificación "tendencia sostenida"
  no cambia (la presencia de un evento no "explica"
  automáticamente la tendencia).
- **Cuenta sin datos.** 0 episodios, resumen "Sin suficiente
  histórico".

## 12. Definition of Done

- [x] Spec aprobada.
- [x] Plan de implementación ejecutado (single wave pre-DDD).
- [x] Backend implementado (`backend/services/patterns.js`).
- [x] API expuesta (`backend/routes/patterns.js`).
- [x] Frontend integrado (botón + panel + Alpine state).
- [x] `docs/design-document.md` actualizado (referencia a los
  umbrales en env vars, no a umbrales hardcoded).
- [x] `docs/progress.md` registra el envío (entrada del 2026-08-04).
- [x] Smoke test del happy path ejecutado manualmente con 2
  datasets reales.
- [x] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`alerts`** (`backend/services/alerts.js`) — el detector de
  patrones **no reemplaza** al motor de alertas. La alertas se
  disparan en base a la predicción; los patrones son narrativos y
  miran hacia atrás. Coexisten.
- **`predictions`** (`backend/services/predictionClient.js`) — el
  detector reusa `buildSeries` y `sourceForMetric` del motor de
  predicción. No se duplica la lógica de agregación diaria.
- **`external_events`** (`backend/routes/externalEvents.js`) — el
  cruce con eventos externos (RF-8) hace que registrar un evento
  enriquezca retroactivamente el resumen de patrones del rango
  que lo cubre. No hay acoplamiento fuerte: si la tabla no tiene
  eventos, el motor funciona igual.
