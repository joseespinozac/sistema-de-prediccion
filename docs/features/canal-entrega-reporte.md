# Feature Spec — canal-entrega-reporte

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend + infra
> **Depends on:** R-003 (publicar OAuth, si afecta entregabilidad)
> **Roadmap:** [R-004](../roadmap.md)

---

## 1. Resumen

Hoy el reporte periódico (cron `backend/jobs/cron.js`) genera y
guarda un snapshot en `report_snapshots` pero no se **envía** a
nadie. Esta feature agrega el canal de entrega del reporte (email o
Slack) para que el equipo reciba el resumen sin tener que abrir
manualmente la app.

## 2. Problema

El reporte existe en BD pero requiere que alguien abra el
dashboard o consulte la API para verlo. Si nadie lo mira, no sirve
como mecanismo proactivo de alerta.

## 3. Objetivos

- [ ] Decidir el canal (email vs. Slack vs. ambos) — input de
  Yamilet.
- [ ] Implementar el envío del snapshot por el canal elegido.
- [ ] Enviar **solo** cuando hay alertas activas o caídas
  significativas (evitar spam).
- [ ] Configurar destinatarios vía env vars (no en BD).

## 4. Casos de uso

- **CU-RPT-01.** Editor recibe un email diario (8:00 AM hora
  local) con el resumen del día anterior: alertas activas,
  predicciones relevantes, eventos registrados.
- **CU-RPT-02.** Editor ve un mensaje en un canal de Slack
  cuando se genera el reporte con un link al dashboard.
- **CU-RPT-03.** Si no hay alertas activas y no hay eventos
  relevantes, no se envía (silencio operativo).

## 5. Requisitos funcionales

- **RF-1.** Después de generar el snapshot en `report_snapshots`,
  el orquestador (futuro `backend/jobs/scheduler.js`) llama al
  envío del reporte.
- **RF-2.** Modos soportados: `email`, `slack`, `both`, `none`
  (configurable vía `REPORT_DELIVERY_CHANNEL`).
- **RF-3.** Destinatarios vía env vars: `REPORT_EMAIL_TO=...`
  (comma-separated), `SLACK_WEBHOOK_URL=...`.
- **RF-4.** Plantilla del reporte: subject + cuerpo con
  sección por cuenta activa, top 3 alertas, eventos recientes.
- **RF-5.** Throttle: máximo 1 envío por canal por día (evitar
  reenvíos por retries).

## 6. Requisitos no funcionales

- **RNF-1.** El envío debe ser fire-and-forget: si Slack está
  caído, el reporte de hoy queda en BD (no se reintenta más
  tarde).
- **RNF-2.** Los secretos del canal (SMTP password, Slack
  webhook URL) se leen de env vars, no de BD.

## 7. Cambios al modelo de datos

Sin cambios. Reusa `report_snapshots`.

## 8. Cambios de API

Sin cambios.

## 9. Cambios UI

Sin cambios (posible vista "configuración de envío" en el futuro,
no en v1).

## 10. Riesgos

- **Riesgo 1.** Email cae en spam. Mitigación: configurar SPF/DKIM
  del dominio antes de activar.
- **Riesgo 2.** Slack webhook comprometido se usa para spam.
  Mitigación: rotar webhook periódicamente + alertas por uso
  anómalo.
- **Riesgo 3.** Cambio de decisión de canal a mitad de wave.
  Mitigación: la decisión se toma antes de empezar el plan.

## 11. Casos borde

- **Sin destinatarios configurados** → no se envía, se loggea
  warning.
- **Snapshot vacío** (sin cuentas activas) → no se envía.

## 12. Definition of Done

- [ ] Canal decidido y documentado.
- [ ] Envío implementado (según el canal elegido).
- [ ] Al menos 1 envío real verificado (cuenta demo).
- [ ] `docs/design-document.md` actualizado (§5.6 o nuevo §11 si
  el alcance lo amerita).
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`backend/jobs/cron.js`** — la migración a `scheduler.js` +
  `report-snapshot.js` (ADR-004) es prerequisito estructural. No
  es bloqueante lógico, pero el nuevo job debería diseñarse
  siguiendo el patrón de ADR-004.
- **R-009 notificaciones Slack tiempo real** — comparte
  infraestructura de Slack (webhook). Diseñar los dos juntos.
