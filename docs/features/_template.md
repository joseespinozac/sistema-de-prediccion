# Feature Spec — <feature-name>

> **Status:** `draft` | `in_progress` | `completed` | `rejected`
> **Version target:** v<X>.<Y>
> **Owner:** <github handle or team>
> **Depends on:** `<feature-name>` (or *none*)

---

## 1. Resumen

Una o dos frases que expliquen qué hace la feature y para quién.

## 2. Problema

Qué dolor resuelve. Sin esta sección, no hay feature.

## 3. Objetivos

Lista verificable. Cada bullet es algo que se puede marcar como ✅ o ❌.

- [ ] Objetivo 1
- [ ] Objetivo 2

## 4. Casos de uso

Lista de flujos que la feature habilita. Referenciar los CU de
`docs/design-document.md` cuando aplique.

- **CU-XXX-01** — descripción.
- **CU-XXX-02** — descripción.

## 5. Requisitos funcionales

Lista numerada. Cada RF debe ser testeable.

- **RF-1.** El sistema debe ...
- **RF-2.** El sistema debe ...

## 6. Requisitos no funcionales

Performance, accesibilidad, seguridad, usabilidad, etc.

- **RNF-1.** ...
- **RNF-2.** ...

## 7. Cambios al modelo de datos

Tablas nuevas, columnas nuevas, índices, FK. Si no hay cambios, escribir
"Sin cambios al modelo de datos".

| Tabla | Operación | Detalle |
|---|---|---|
| `<tabla>` | CREATE / ALTER / DROP | descripción |

## 8. Cambios de API

Endpoints nuevos o modificados. Si no hay, escribir
"Sin cambios a la API".

| Método | Path | Descripción |
|---|---|---|
| `POST` | `/api/...` | ... |

## 9. Cambios UI

Pantallas nuevas o modificadas, componentes nuevos, navegación afectada.

- `frontend/<archivo>.html` — ...
- Nuevo componente / helper en `frontend/js/`.

## 10. Riesgos

Lo que puede salir mal y cómo se mitiga.

- **Riesgo 1.** Mitigación: ...

## 11. Casos borde

Comportamiento esperado en situaciones límite.

- **Cantidad cero.** ...
- **Concurrencia.** ...
- **Permisos insuficientes.** ...

## 12. Definition of Done

Lista de aceptación. La feature no está completa hasta que todas estén ✅.

- [ ] Spec aprobada.
- [ ] Plan de implementación ejecutado.
- [ ] Tests automatizados (si aplica).
- [ ] `docs/design-document.md` actualizado.
- [ ] `docs/progress.md` registra el cierre.
- [ ] Smoke test del happy path ejecutado manualmente.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

Qué specs, ADRs, o partes del sistema se ven afectadas.

- `<otra-feature>` — razón.
- `ADR-NNN` — referencia.
