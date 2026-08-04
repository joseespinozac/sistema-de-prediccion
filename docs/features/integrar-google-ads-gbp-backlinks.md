# Feature Spec — integrar-google-ads-gbp-backlinks

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend
> **Depends on:** R-003 (publicar OAuth, facilita el flujo), R-005
> (hosting, evita dev/prod mismatch)
> **Roadmap:** [R-015](../roadmap.md)

---

## 1. Resumen

Ampliar las fuentes de datos más allá de GA4/GSC. Cada fuente
(Google Ads, Google Business Profile, Ahrefs/Semrush para
backlinks) es su propio proyecto de integración con OAuth o API key
propios y modelo de datos nuevo.

## 2. Problema

El modelo de tráfico real es más amplio que lo que GA4/GSC
capturan. El equipo de cuentas a veces quiere ver clicks pagos
(Ads), tráfico local (GBP), o autoridad de dominio (backlinks)
en el mismo dashboard para tener el contexto completo.

## 3. Objetivos

- [ ] Cada fuente se implementa **independientemente** (no hay
  "big bang" de 4 fuentes a la vez).
- [ ] El primer objetivo realista es **Google Ads** (porque tiene
  OAuth flow similar a GA4).
- [ ] Cada integración nueva requiere un RFC + spec antes de
  implementación.

## 4. Casos de uso

- **CU-ADS-01.** Editor ve "Clics (GSC): 1,200 + Clics (Ads):
  350" en la misma gráfica para una URL.
- **CU-GBP-01.** Para cuentas con perfil de Google Business, ver
  las búsquedas locales que llevan al sitio.

## 5. Requisitos funcionales

- **RF-1.** OAuth de Google Ads usa el mismo flujo que GA4/GSC,
  scope adicional: `https://www.googleapis.com/auth/adwords`.
- **RF-2.** Modelo de datos: nueva tabla `external_traffic`
  (source, account_id, fecha, clics, ...) con `source` enum:
  `'ads' | 'gbp' | 'ahrefs' | ...`.
- **RF-3.** UI: nuevo selector de fuente en el dashboard, junto
  al de métrica.

## 6. Requisitos no funcionales

- **RNF-1.** Cada integración añade ≤ 1 endpoint nuevo y ≤ 1
  tabla nueva. Sin refactor mayor.

## 7. Cambios al modelo de datos

| Tabla | Operación | Detalle |
|---|---|---|
| `external_traffic` | CREATE | Nueva tabla para Ads/GBP/backlinks |

## 8. Cambios de API

Pendiente por fuente. Empezando con Ads:
`GET /api/accounts/:id/ads-traffic?start=&end=`

## 9. Cambios UI

Pendiente por fuente. Selector adicional en
`frontend/index.html`.

## 10. Riesgos

- **Riesgo 1.** Google Ads API tiene cuotas y límites. Mitigación:
  cachear en `external_traffic` como ya se hace con GA4/GSC.
- **Riesgo 2.** Ahrefs/Semrush tienen costo de suscripción
  separado. Mitigación: validar con el equipo si el costo se
  justifica antes de implementar.

## 11. Casos borde

- **Cuenta sin perfil GBP** → el selector lo omite, no muestra
  error.
- **API key de Ahrefs revocado** → la UI deshabilita la fuente +
  loggea.

## 12. Definition of Done

- [ ] RFC específico por fuente (Ads primero).
- [ ] Spec específica por fuente.
- [ ] Plan atómico + ship.
- [ ] `docs/design-document.md` actualizado.
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **`external_traffic`** (nueva) — tabla genérica.
- **OAuth flow** — el módulo de `googleOAuth` se extiende con
  nuevos scopes.
