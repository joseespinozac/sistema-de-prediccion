# Feature Spec — publicar-oauth-google

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** infra
> **Depends on:** decisión de negocio (¿E3 tiene Google Workspace?)
> **Roadmap:** [R-003](../roadmap.md)

---

## 1. Resumen

Hoy la app está en modo **Testing** en Google Cloud — el refresh
token de OAuth expira cada 7 días y hay que reconectar cada cuenta
de Google manualmente. Esta feature saca la app del modo Testing
para que las conexiones de cuentas sean persistentes.

## 2. Problema

El mayor punto de fricción operativa del proyecto: sin esto, cada
cuenta conectada se desconecta sola cada semana y el equipo tiene
que volver a hacer el flujo OAuth de 5 pasos cada lunes. Para uso
continuo del equipo, esto es insostenible.

## 3. Objetivos

- [ ] Confirmar con Yamilet si E3 tiene Google Workspace (decisión
  que desbloquea la configuración).
- [ ] Si sí: configurar la pantalla de consentimiento como
  **Internal** (evita verificación de Google para scopes
  sensibles).
- [ ] Si no: configurar como **External** y enviar a verificación
  (puede tardar días/semanas).
- [ ] Validar que las conexiones existentes (de "Empeño Facil" y
  la cuenta demo) sigan funcionando después del cambio.

## 4. Casos de uso

- **CU-OAU-01.** Equipo conecta una cuenta de Google nueva → el
  refresh token dura > 30 días (idealmente sin expiración).
- **CU-OAU-02.** Después del cambio de modo, ninguna cuenta
  conectada se desconecta sola por expiración.

## 5. Requisitos funcionales

- **RF-1.** Configurar la pantalla de consentimiento OAuth en
  Google Cloud Console según el resultado de la decisión de
  negocio.
- **RF-2.** Actualizar la documentación interna sobre qué modo se
  eligió y por qué.
- **RF-3.** Revalidar las conexiones existentes tras el cambio
  (token refresh + nueva conexión).

## 6. Requisitos no funcionales

- **RNF-1.** La configuración no debe requerir cambios de código.

## 7. Cambios al modelo de datos

Sin cambios.

## 8. Cambios de API

Sin cambios.

## 9. Cambios UI

Sin cambios.

## 10. Riesgos

- **Riesgo 1.** Si se elige External y Google pide revisar la app
  (scopes sensibles), el proceso puede tardar semanas o requerir
  información que el equipo no tiene. Mitigación: esta decisión
  la toma Yamilet, no el agente.
- **Riesgo 2.** Cambio de modo puede invalidar tokens existentes.
  Mitigación: probar primero con una cuenta secundaria antes de
  la cuenta real principal.

## 11. Casos borde

- **E3 sí tiene Workspace pero el dominio no está verificado.**
  Mitigación: verificar dominio antes del cambio.
- **Una o más cuentas ya conectadas en modo Testing.** Mitigación:
  reconectar después del cambio.

## 12. Definition of Done

- [ ] Decisión de negocio documentada (Workspace sí/no).
- [ ] Modo OAuth actualizado en Google Cloud Console.
- [ ] Conexiones existentes siguen funcionando ≥ 30 días sin
  reconexión manual.
- [ ] `docs/design-document.md` actualizado (§4.1 nota sobre
  Workspace).
- [ ] `docs/progress.md` registra el envío.
- [ ] `docs/roadmap.md` movido a `completed`.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`googleOAuth`** (`backend/services/googleOAuth.js`) — sin
  cambios; el código ya soporta el modo Internal/External. Solo es
  config de Google Cloud.
- **R-009 notificaciones Slack tiempo real** — comparte el mismo
  disparador; puede ejecutarse junto.
