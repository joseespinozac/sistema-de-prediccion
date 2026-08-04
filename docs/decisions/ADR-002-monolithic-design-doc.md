# ADR-002 — Mantener `docs/design-document.md` como archivo único

> **Date:** 2026-08-04
> **Status:** accepted

---

## 1. Contexto

`docs/design-document.md` (migrado desde `implementation-plan.md`)
contiene:

- Resumen ejecutivo y objetivos (§1–2).
- Alcance dentro/fuera de v1 (§3).
- Decisiones de arquitectura (§4).
- Vista de componentes del sistema (§5).
- Integraciones externas y seguridad de credenciales (§6).
- Modelo de datos — 11 entidades (§7).
- Motor de predicción — contrato, cold start, registro de precisión (§8).
- Funcionalidades v1 (§9).
- Requisitos no funcionales (§10).
- Lineamientos de UI/UX (§11).
- Roadmap por fases — referencia histórica de las fases ya
  implementadas (§12).
- Futuras funcionalidades — referencia (§13, ahora en `roadmap.md`).
- Riesgos y decisiones abiertas (§14).

Total: ~300 líneas, organizado en secciones de nivel 2 con un
subconjunto de sub-secciones de nivel 3. La sección §7 (modelo de
datos) es la más referenciada y la candidata obvia a expandirse con
el tiempo si se agregan entidades.

## 2. Problema

¿Este documento debe quedarse como un único archivo, o conviene
partirlo en `docs/architecture.md`, `docs/data-model.md`,
`docs/security.md`, etc.?

## 3. Alternativas

### A. Partir en un archivo por tema

Reemplazar el monolito con un directorio `docs/design/` con un
archivo Markdown por responsabilidad.

**Pro:** Cada archivo se mantiene pequeño e individualmente
linkable. Las secciones se vuelven URL-estables. Editar un tema
no toca los otros.
**Contra:** Las referencias cruzadas se multiplican (`ver
data-model#product_warehouse_stock` en vez de
`ver #product_warehouse_stock`). El lector tiene que armar el
modelo mental siguiendo links. La propiedad de "fuente única de
verdad" que el proyecto necesita para hacer `grep -n "RF3.2" docs/`
deja de funcionar en un solo comando.

### B. Mantener como archivo único, reorganizar internamente

Mantener `docs/design-document.md` como un único archivo Markdown.
Reorganizar bajo las 10 secciones de `governance.md §4`
(Arquitectura, Modelo de Datos, Servicios externos, Motor de
predicción, Seguridad, Convenciones, Restricciones, Componentes,
Decisiones abiertas, Diagramas). Tabla de contenidos al inicio con
anchor links.

**Pro:** Fuente única de verdad, un archivo para hacer grep, una
URL para compartir. Los anchor links hacen las secciones
deep-linkables desde features y ADRs.
**Contra:** El archivo sigue siendo grande. Encontrar una sección
sigue requiriendo scroll o navegación por anchors.

### C. Híbrido: partir solo cuando una sección supere un umbral

Mantener el monolito con TOC. Regla explícita: si una sección
crece más allá de 1000 líneas, partirla en un archivo hermano y
enlazar desde el TOC.

**Pro:** Aplaza la decisión de partir hasta que los datos lo
justifiquen. El umbral es explícito.
**Contra:** Los archivos hermanos introducen links cruzados que hay
que mantener. La regla invita a nuevas discusiones de ADR cada vez
que una sección se acerca al umbral.

## 4. Decisión

**Adoptar opción B.** El monolito se queda como un solo archivo,
reorganizado bajo las 10 secciones de `governance.md §4`. Anchor
links hacen que las referencias profundas funcionen. Si una sección
crece más allá de 1000 líneas, se revisita esta decisión con un
nuevo ADR — el escape hatch de la opción B.

## 5. Consecuencias

Positivas:

- Un archivo, una URL, un target de grep.
- Los anchors internos hacen que las feature specs y los ADRs
  referencien limpio.
- Las 10 secciones de nivel 1 mapean 1:1 a `governance.md §4`.

Negativas:

- El archivo se mantiene grande. Mitigación: TOC al inicio +
  fronteras claras entre secciones + deduplicación de cualquier
  duplicado que aparezca.
- Si el proyecto crece (multi-cuenta, multi-fuente de datos), la
  sección §7 (modelo de datos) puede pasar las 1000 líneas.
  Mitigación: umbral explícito + escape hatch vía ADR.

Reversibilidad: alta. Partir después es un futuro ADR.
