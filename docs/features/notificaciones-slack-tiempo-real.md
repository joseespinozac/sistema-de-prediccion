# Feature Spec — notificaciones-slack-tiempo-real

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend + infra
> **Depends on:** R-004 (canal de entrega, infraestructura Slack)
> **Roadmap:** [R-009](../roadmap.md)

---

## 1. Resumen

Avisar en un canal de Slack **en tiempo real** cuando se detecta
una alerta nueva (no esperar al reporte diario), además del envío
programado.

## 2. Problema

Aunque R-004 entregue el reporte diario, una caída del 40% merece
un aviso inmediato, no en 8h. Complementar el canal diario con
notificaciones instantáneas de las alertas más severas.

## 3. Objetivos

- [ ] Reusar el webhook de Slack configurado en R-004.
- [ ] Disparar mensaje cuando se crea una `alert` con
  `severidad = 'alta'`.
- [ ] Throttle: máximo 5 mensajes / cuenta / día.
- [ ] Mensaje compacto: cuenta, métrica, severidad, %, link al
  dashboard.

## 4. Casos de uso

- **CU-SLK-01.** Tráfico real cae 45% vs yhat → alerta `severidad
  = alta` → mensaje en Slack `#seo-alertas` con link al
  dashboard.
- **CU-SLK-02.** Misma cuenta tiene 3 alertas más en el día → no se
  mandan (throttle).

## 5. Requisitos funcionales

- **RF-1.** Hook que escucha la creación de `alerts`.
- **RF-2.** Si `severidad IN ('alta', 'media')` Y el throttle no
  está agotado → envía al webhook de Slack.
- **RF-3.** Mensaje formato Slack Block Kit con: cuenta, métrica,
  tipo (caída/pico), magnitud, fecha del evento, link al
  dashboard.
- **RF-4.** Throttle: contador por `(account_id, día)` en BD o en
  memoria.

## 6. Requisitos no funcionales

- **RNF-1.** Fire-and-forget: si el webhook falla, no se
  reintenta, se loggea.

## 7. Cambios al modelo de datos

Sin cambios.

## 8. Cambios de API

Sin cambios.

## 9. Cambios UI

Sin cambios.

## 10. Riesgos

- **Riesgo 1.** Múltiples alertas en cascada llenan Slack.
  Mitigación: throttle + resumen diario consolida el resto.
- **Riesgo 2.** Webhook compartido entre R-004 y R-009 → un fallo
  en Slack rompe ambos. Mitigación: tratar Slack como
  infraestructura única (R-004 es owner del secret).

## 11. Casos borde

- **`severidad = 'baja'`** → no notificar (es ruido).
- **Webhook no configurado** → skip silencioso.

## 12. Definition of Done

- [ ] Hook implementado.
- [ ] Al menos 1 alerta real enviada con cuenta demo.
- [ ] Throttle verificado.
- [ ] `docs/design-document.md` actualizado.
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`alerts`** — hook transversal.
- **R-006 detección anomalías tiempo real** — comparten
  disparador. Coordinar.
- **R-004** — comparte infra de Slack.
