# Feature Spec — exportar-reportes-pdf-ppt

> **Status:** `pending`
> **Version target:** (TBD)
> **Owner:** backend
> **Depends on:** generadores E3 existentes (skill externa)
> **Roadmap:** [R-012](../roadmap.md)

---

## 1. Resumen

Conectar el snapshot de `report_snapshots` a los generadores de
PDF/PPT con identidad de marca de E3 que el equipo ya tiene
disponibles como skills, para producir un entregable presentable,
no solo JSON.

## 2. Problema

El snapshot existe y es completo pero no es presentable a un
cliente o a un stakeholder que no usa el dashboard. Generar un PDF
es un paso manual con copy-paste.

## 3. Objetivos

- [ ] Generar PDF del snapshot del último reporte con la plantilla
  de marca E3.
- [ ] Botón "Exportar PDF" en el panel del snapshot si está
  disponible.
- [ ] Email con PDF adjunto cuando se entrega el reporte (R-004).

## 4. Casos de uso

- **CU-EXP-01.** Editor abre el snapshot del último reporte
  → "Exportar PDF" → recibe un PDF con las gráficas embebidas,
  alertas, y resumen narrativo, todo con la marca E3.
- **CU-EXP-02.** El reporte diario (R-004) adjunta el PDF al
  email.

## 5. Requisitos funcionales

- **RF-1.** Skill de generación de PDF se invoca desde el
  backend con el snapshot como input.
- **RF-2.** El output es descargable via
  `GET /api/reports/:id/export.pdf` (autenticado).
- **RF-3.** El PDF embebe las gráficas como PNG (renderizadas
  vía ApexCharts server-side o captura del frontend).

## 6. Requisitos no funcionales

- **RNF-1.** Tiempo de generación ≤ 5s.
- **RNF-2.** El PDF pesa ≤ 2 MB.

## 7. Cambios al modelo de datos

Sin cambios. Reusa `report_snapshots`.

## 8. Cambios de API

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/reports/:id/export.pdf` | Descarga el PDF del snapshot |

## 9. Cambios UI

- Botón "Exportar PDF" en el panel de snapshot.

## 10. Riesgos

- **Riesgo 1.** El generador de PDF externo tiene dependencias
  pesadas. Mitigación: ejecutarlo solo on-demand, no en el
  request del usuario.
- **Riesgo 2.** Render de gráficas en el PDF requiere headless
  browser. Mitigación: usar `chrome --headless` o `puppeteer`.

## 11. Casos borde

- **Generador externo no disponible** → deshabilitar el botón,
  mostrar mensaje.
- **Snapshot sin gráficas (cuenta sin datos)** → PDF sigue
  generándose con tabla de alertas vacía.

## 12. Definition of Done

- [ ] Endpoint PDF implementado.
- [ ] PDF se ve correcto en 1 cuenta real de prueba.
- [ ] Botón UI funcional.
- [ ] `docs/design-document.md` actualizado.
- [ ] `docs/progress.md` registra el envío.
- [ ] `npm run docs:check` pasa.

## 13. Impacto sobre otras funcionalidades

- **R-004 canal de entrega** — el email lleva el PDF adjunto.
