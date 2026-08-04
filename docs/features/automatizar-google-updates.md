# Feature Spec — automatizar-google-updates

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend
> **Depends on:** *none*
> **Roadmap:** [R-013](../roadmap.md)

---

## 1. Resumen

Hoy los updates de Google se registran a mano en `external_events`.
Esta feature automatiza la captura con scraping o RSS de trackers
públicos (Search Engine Land, Search Engine Roundtable, Twitter/X
de cuentas oficiales de Google).

## 2. Problema

El registro manual depende de que alguien vea la noticia y la
anote. En la práctica, el evento se registra horas o días después
de que pasó — perdiendo valor como cruce con predicciones.

## 3. Objetivos

- [ ] Job diario que scrapea / lee RSS de 2-3 fuentes.
- [ ] Deduplicación: si el mismo evento ya está en
  `external_events`, no se duplica.
- [ ] Categorización automática: si la fuente menciona "Core
  Update" → `tipo = update_google`. Si no, queda como
  `mercado`.

## 4. Casos de uso

- **CU-AGU-01.** Job corre a las 6 AM → scrapea Search Engine
  Roundtable → encuentra "March 2026 Core Update" → crea fila en
  `external_events` con fecha de hoy + tipo + descripción +
  source URL.
- **CU-AGU-02.** Otro scraper trae el mismo evento 2h después →
  dedupe evita duplicado.

## 5. Requisitos funcionales

- **RF-1.** Job `backend/jobs/google-updates-sync.js` (siguiendo
  ADR-004) corre 1 vez al día.
- **RF-2.** Dedup key: `(fecha, tipo, hash(titulo))` para evitar
  duplicados cercanos.
- **RF-3.** Scraper configurable via lista de fuentes en `.env`.

## 6. Requisitos no funcionales

- **RNF-1.** El scraper **no debe fallar el job** si una fuente
  está caída (try/catch individual).
- **RNF-2.** Latencia del job ≤ 30s.

## 7. Cambios al modelo de datos

Sin cambios (reusa `external_events`).

## 8. Cambios de API

Sin cambios visibles.

## 9. Cambios UI

Opcional: badge "auto-registrado" en eventos de la UI para
distinguir del registro manual.

## 10. Riesgos

- **Riesgo 1.** Scraper se rompe si la fuente cambia su HTML.
  Mitigación: monitor de fuente + alerta cuando falla el job 2
  días consecutivos.
- **Riesgo 2.** Captura información no relevante. Mitigación: el
  equipo puede borrar entradas desde la UI existente.

## 11. Casos borde

- **RSS desactualizado o caído** → skip silencioso + log
  warning.
- **Evento detectado en idioma no español** → guardar título
  original + traducido en español por LLM (opcional v2).

## 12. Definition of Done

- [ ] Job implementado con al menos 1 fuente RSS.
- [ ] Deduplicación verificada con 5 eventos de prueba.
- [ ] Al menos 1 semana de ejecución real con ≥ 3 fuentes sin
  duplicados.
- [ ] `docs/design-document.md` actualizado (§4.3).
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`external_events`** — más entradas automáticas; el motor de
  alertas y el detector de patrones se benefician.
- **R-006 detección anomalías** — los cruces mejoran.
