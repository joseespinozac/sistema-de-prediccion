# Feature Spec — roles-usuario

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend
> **Depends on:** *none*
> **Roadmap:** [R-007](../roadmap.md)

---

## 1. Resumen

Hoy todos los usuarios son `member` con los mismos permisos. Esta
feature diferencia **admin** y **member**: solo admin puede
desconectar cuentas de Google o borrar registros de estrategia
de otra persona.

## 2. Problema

En un equipo donde varias personas escriben en el mismo log de
estrategia y manejan cuentas de Google compartidas, la
posibilidad de borrar accidental o maliciosamente lo que otro
escribió es un riesgo operacional y de auditoría.

## 3. Objetivos

- [ ] Diferenciar permisos por rol en al menos 4 endpoints
  sensibles.
- [ ] UI: esconder botones de acción restringida cuando el rol
  no lo permite (no solo deshabilitar).
- [ ] Migración que promueva al menos 1 usuario existente a admin
  (Yamilet).

## 4. Casos de uso

- **CU-RLS-01.** Editor (member) ve la lista de cuentas
  conectadas pero **no** ve el botón "Desconectar cuenta de
  Google".
- **CU-RLS-02.** Admin ve y puede usar el botón "Desconectar
  cuenta de Google".
- **CU-RLS-03.** Editor ve el log de estrategia y puede agregar
  entradas; no puede borrar entradas de otros.

## 5. Requisitos funcionales

- **RF-1.** Endpoints sensibles con guard de rol:
  - `POST /api/accounts/:id/google/disconnect` (admin)
  - `DELETE /api/strategy_log/:id` (admin o autor).
  - `POST /api/external_events` (admin).
- **RF-2.** UI: botones restringidos **no se renderizan** para
  members, no solo se deshabilitan.
- **RF-3.** Migración: promover a 1 admin inicial (idempotente,
  usa `upsert` por email).

## 6. Requisitos no funcionales

- **RNF-1.** El check de rol es **server-side** obligatorio. El
  hide de UI nunca es la única defensa.

## 7. Cambios al modelo de datos

| Tabla | Operación | Detalle |
|---|---|---|
| `users` | ALTER | (ya tiene `rol` desde Fase 1; verificar default `member`) |

## 8. Cambios de API

| Método | Path | Permiso |
|---|---|---|
| `POST` | `/api/accounts/:id/google/disconnect` | admin |
| `DELETE` | `/api/strategy_log/:id` | admin OR autor |

## 9. Cambios UI

- `frontend/index.html` — botón "Desconectar cuenta" oculto para
  members.
- `frontend/index.html` — columna "Borrar" de la tabla de
  estrategia: oculta para entries de otros users si el viewer es
  member.

## 10. Riesgos

- **Riesgo 1.** Asumir que ocultar el botón = seguridad.
  Mitigación: el check es server-side; el hide es solo UX.
- **Riesgo 2.** Un admin puede borrar todo. Mitigación: loggear
  en `audit_log` (futuro) quién borró qué y cuándo.

## 11. Casos borde

- **Usuario sin rol definido** (legacy data) → tratar como
  `member`. Migración asigna explícitamente.
- **Último admin intenta degradarse** → bloquear.

## 12. Definition of Done

- [ ] Spec aprobada.
- [ ] Plan ejecutado.
- [ ] 3 endpoints con guard server-side (verificación manual con
  curl simulando 2 roles).
- [ ] UI oculta los botones restringidos para member.
- [ ] Migración promueve a Yamilet como admin.
- [ ] `docs/design-document.md` actualizado.
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`auth`** (`backend/plugins/auth.js`) — el session middleware
  expone `user.rol` para los guards.
- **`strategyLog`** y **`externalEvents`** — endpoints protegidos.
