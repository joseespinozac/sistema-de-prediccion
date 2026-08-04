# Feature Spec — soporte-multi-cliente

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend + producto
> **Depends on:** decisión de negocio (¿E3 quiere vender esto como
> producto a clientes?)
> **Roadmap:** [R-016](../roadmap.md)

---

## 1. Resumen

Hoy es explícitamente una herramienta interna (fuera de alcance en
v1). Habilitar acceso de clientes externos requiere aislar datos
por cliente, permisos, y branding por cliente.

## 2. Problema

Si E3 decide monetizar el producto ofreciendo la herramienta a
sus clientes de SEO, hoy no hay forma de darle a un cliente acceso
"a su cuenta" sin darle también acceso a las cuentas de los demás.

## 3. Objetivos

- [ ] Decisión de negocio primero (¿vender a clientes o
  quedarse interno?).
- [ ] Si sí: diseñar el modelo multi-tenant con aislamiento de
  datos.
- [ ] UI: branding por cliente (logo, colores).

## 4. Casos de uso

- **CU-MTC-01.** Cliente X entra con sus credenciales → solo ve
  sus cuentas conectadas, sus predicciones, su log de
  estrategia. No puede ver Cliente Y.
- **CU-MTC-02.** E3 admin entra como superusuario y ve todos los
  clientes en una vista agregada.

## 5. Requisitos funcionales

- **RF-1.** Nueva entidad `tenants` (cliente de E3).
- **RF-2.** Cada `account`, `google_connection`, `prediction`,
  `alert`, etc. tiene `tenant_id`.
- **RF-3.** Endpoints filtran por `tenant_id` derivado de la
  sesión.
- **RF-4.** UI carga `tenant_id` desde sesión y aplica branding.

## 6. Requisitos no funcionales

- **RNF-1.** Aislamiento total: ninguna query cross-tenant
  accidental. Mitigación: tests de seguridad + query builders
  que fuerzan `WHERE tenant_id = ...`.

## 7. Cambios al modelo de datos

Multi-tabla. Probablemente **migración de datos** (asignar
`tenant_id` a filas existentes).

## 8. Cambios de API

Multi-endpoint. Probablemente introducción de prefijo
`/api/tenants/:tenantId/...`.

## 9. Cambios UI

Multi-pantalla. Probablemente selector de tenant en header para
admins.

## 10. Riesgos

- **Riesgo 1.** Cambio de arquitectura mayor. Mitigación: ADR +
  RFC detallado antes de empezar.
- **Riesgo 2.** Migración de datos rompe algo. Mitigación:
  plan de rollback + backup completo antes.
- **Riesgo 3.** Performance se degrada con muchos tenants.
  Mitigación: indexar `tenant_id` en todas las tablas
  afectadas.

## 11. Casos borde

- **Cliente con 0 cuentas conectadas** → vista vacía + CTA.
- **E3 admin impersonando a un cliente** → acción logged en
  `audit_log`.

## 12. Definition of Done

- [ ] Decisión de negocio documentada (sí multi-cliente).
- [ ] RFC completo aprobado.
- [ ] Spec detallada (este doc es la versión inicial).
- [ ] Plan atómico por wave (estimado: 3-4 waves por la
  envergadura del cambio).
- [ ] `docs/design-document.md` actualizado (probablemente +
 1000 líneas; evaluar ADR-002 escape hatch).
- [ ] `docs/progress.md` registra cada wave.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **Todo el sistema.** Este cambio toca al menos: auth,
  accounts, accounts/:id/*, reports, alerts, strategy_log,
  external_events, google_connections. La decisión
  arquitectural es la más grande del proyecto.
