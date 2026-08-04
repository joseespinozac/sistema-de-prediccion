# ADR-001 — Extender `docs/` con `governance.md` y `design-system.md`

> **Date:** 2026-08-04
> **Status:** accepted

---

## 1. Contexto

`ADR-000` define el árbol mínimo de `docs/` para soportar el flujo
DDD:

```
docs/
├── design-document.md
├── roadmap.md
├── progress.md
├── features/
├── rfcs/
├── decisions/
└── implementation/
```

Durante la implementación de `ADR-000` se introdujeron dos archivos
adicionales que el árbol mínimo no listaba:

- `docs/governance.md` — reglas del flujo DDD (qué documento
  contiene qué, qué flujo seguir, qué numeración usar, qué verifica
  el script).
- `docs/design-system.md` — tokens de UI (colores, tipografía,
  espaciado, componentes recurrentes) que el proyecto usa
  inconsistentemente entre `frontend/index.html` (CDN Tailwind en dev)
  y `frontend/css/input.css` (build de Tailwind a `app.css`).

Estos dos archivos se introdujeron sin una decisión explícita que
los promulgue.

## 2. Problema

¿`docs/` debe limitarse a los 4 archivos + 4 carpetas del layout
mínimo de `ADR-000`, o se admite la extensión natural de
`governance.md` y `design-system.md`?

## 3. Alternativas

### A. Layout estricto (solo lo del árbol mínimo)

Borrar `governance.md` y `design-system.md`. Devolver cualquier
contenido a `implementation-plan.md` o al README.

**Pro:** Coincidencia 1:1 con el contrato del árbol mínimo.
**Contra:** Las reglas del flujo DDD se diluyen en ADRs sueltos y
se vuelven obsoletas en cuanto se añadan más ADRs. El design system
queda físicamente lejos del design document y rompe el principio
"fuente de verdad adyacente a la spec".

### B. Adoptar `governance.md` y `design-system.md` como extensiones oficiales del layout

Mantener los dos archivos. Documentar la extensión aquí.

**Pro:** El layout refleja la realidad operativa. `governance.md`
centraliza las reglas y el verificador. `design-system.md` agrupa
los tokens UI en un solo lugar consultable.
**Contra:** Cualquier extensión futura vuelve a requerir un ADR, lo
cual añade fricción.

### C. Fusionar `governance.md` dentro de `ADR-000`

Eliminar `governance.md` y mover su contenido como apéndice de
`ADR-000`.

**Pro:** Sin archivos extra.
**Contra:** `ADR-000` pasa de ~150 a ~350 líneas, viola el principio
de ADR conciso y dificulta el versionado independiente del
governance.

## 4. Decisión

**Adoptar opción B.** El layout oficial de `docs/` queda así:

```
docs/
├── governance.md            Reglas del flujo DDD (nuevo en este ADR).
├── design-document.md       Fuente de verdad del sistema.
├── design-system.md         UI tokens, copy rules, componentes recurrentes.
├── roadmap.md               Trabajo futuro.
├── progress.md              Historial enviado.
├── features/                Un archivo por feature.
├── rfcs/                    Un archivo por Request For Comments.
├── decisions/               Un archivo por ADR (incluye este).
└── implementation/          Planes técnicos por wave + archivo histórico.
```

Reglas adicionales:

1. **Cualquier nuevo archivo o carpeta top-level en `docs/` requiere
   un ADR.** La regla ya está en `governance.md`; este ADR la
   promulga.
2. **`governance.md` es la única fuente de verdad sobre el flujo
   DDD.** Cualquier conflicto entre este ADR y `governance.md` se
   resuelve a favor de `governance.md`.
3. **`design-system.md` se referencia desde `docs/design-document.md`
   § Componentes.** El design document no duplica tokens; enlaza al
   design system.

## 5. Consecuencias

Positivas:

- `governance.md` queda blindado como contrato del flujo. Futuros
  cambios al flujo (numeración, secciones, verificador) modifican un
  solo archivo.
- `design-system.md` vive junto al design document, reflejando que
  son dos vistas del mismo sistema.
- El layout es ahora explícito: el árbol vive en `ADR-001` y se
  mantiene en sync con la realidad.

Negativas:

- El layout del árbol mínimo de `ADR-000` ya no es el layout
  canónico. Esto se documenta explícitamente para que contribuidores
  externos al proyecto no se sorprendan.
- Cada nuevo archivo top-level en `docs/` requiere un ADR.
  Mitigación: los candidatos obvios (`api-reference.md`,
  `glossary.md`) están listados como futuras extensiones y no
  necesitan entrar a `docs/` raíz.

Reversibilidad: alta. Mover `governance.md` y `design-system.md` de
vuelta es un nuevo ADR de revocación + `git mv`.
