# Roadmap — Predictor de Tráfico E3

> **Source of truth** para trabajo futuro. Contiene **solo** features
> no iniciadas o en progreso. El trabajo enviado vive en
> [`docs/progress.md`](progress.md).
>
> **Status legend:**
> - `pending` — identificada, no empezada
> - `in_progress` — plan activo en `docs/implementation/current.md`
>   o en una wave en ejecución
> - `accepted` — RFC aprobado, esperando plan
> - `rejected` — decidido no hacer
> - `deferred` — pospuesta con rationale
>
> **Versionado:** cada feature tiene un `target_version`
> (semver). La asignación de versión la hace el owner, no el
> agente — ver [`ADR-003`](decisions/ADR-003-implementation-plan-versioning.md).

Este archivo reemplaza al `ROADMAP.md` original (ahora archivado
en
[`docs/implementation/archive/roadmap-pre-DDD.md`](implementation/archive/roadmap-pre-DDD.md)).

Cuando una fila pasa de este archivo a "shipped", se migra a
[`docs/progress.md`](progress.md) con un cross-link al feature
spec completado. La fila no se borra de este documento: queda
como registro histórico de qué se evaluó y por qué.

---

## Tabla resumen (impacto vs. esfuerzo)

| # | Feature | Impacto | Esfuerzo | Status | Depends on | Target |
|---|---|---|---|---|---|---|
| R-001 | Detector de patrones — v1 reglas (semanal) | Alto | M | `completed` | — | v0.0.0 |
| R-002 | Registro de precisión del modelo (real vs. predicho) | Alto | S | `pending` | — | (TBD) |
| R-003 | Publicar OAuth / salir de modo Testing | Alto | S | `pending` | decisión de negocio | (TBD) |
| R-004 | Canal de entrega del reporte (email/Slack) | Alto | M | `pending` | decisión de canal | (TBD) |
| R-005 | Migración a Postgres + hosting (Fase 5) | Alto | M | `pending` | decisión de hosting | (TBD) |
| R-006 | Detección de anomalías en tiempo real | Medio | M | `pending` | — | (TBD) |
| R-007 | Roles de usuario (admin/miembro) | Medio | S | `pending` | — | (TBD) |
| R-008 | Ajuste de umbrales con datos reales | Medio | S | `deferred` | uso real | continuo |
| R-009 | Notificaciones Slack en tiempo real | Medio | S | `pending` | R-004 | (TBD) |
| R-010 | Narración con LLM (v2 del detector de patrones) | Medio | M | `pending` | R-001 validar | (TBD) |
| R-011 | Historial de precisión del modelo (dashboard) | Medio | M | `pending` | R-002 | (TBD) |
| R-012 | Exportar reportes a PDF/PPT (generadores E3) | Medio | S | `pending` | — | (TBD) |
| R-013 | Automatizar captura de updates de Google | Bajo | M | `pending` | — | (TBD) |
| R-014 | Motor de sugerencias v2 con LLM | Bajo | M | `pending` | R-001 validar | (TBD) |
| R-015 | Integrar Google Ads / GBP / backlinks | Bajo | L | `pending` | — | (TBD) |
| R-016 | Soporte multi-cliente | Bajo | L | `pending` | decisión de negocio | (TBD) |

**Target versions** marcados como `(TBD)` se asignan por el owner
antes de empezar el plan atómico de la feature.

---

## Tema 1 — Inteligencia y análisis

### R-001 · Detector de patrones (v1 — reglas, granularidad semanal)

**Qué es:** un resumen en palabras de lo que pasó en la gráfica
durante el rango seleccionado — caídas, recuperaciones, picos y
tendencias sostenidas — sin que el usuario tenga que interpretarlo
a ojo. Ejemplo real: *"la primera semana de mayo cayeron las
sesiones, pero se recuperaron en la segunda semana."*

**Status:** `completed` — [`docs/features/detector-patrones-v1.md`](features/detector-patrones-v1.md).

---

### R-002 · Registro de precisión del modelo (real vs. predicho)

**Qué es:** cada vez que se genera una predicción, guardar
asociado el valor real observado para ese periodo, **incluso si
el dashboard de precisión es v2**. Sin este registro desde el día
uno, no se podrá construir el historial de precisión más adelante.

**Por qué:** gap detectado durante la implementación de R-001. El
plan original §8 lo pedía explícitamente y nunca se implementó.

**Complejidad:** S.

---

### R-010 · Narración con LLM (v2 del detector de patrones)

**Qué es:** en vez de (o además de) las plantillas fijas de
R-001, tomar los **episodios ya detectados por las reglas**
(fechas, tipo, magnitud, evento relacionado) y pedirle a un
modelo de lenguaje que los redacte en un párrafo más natural y
variado — nunca que invente o recalcule los números, solo que los
redacte mejor.

**Por qué separado de R-001:** mismo principio de "reglas
primero, LLM después" que ya usa el motor de sugerencias.

**Status:** `pending` — se retoma cuando R-001 esté en uso real
y se valide qué tanto ayuda el texto por plantillas antes de
pagar costo/latencia de un LLM.

---

### R-006 · Detección de anomalías en tiempo real

**Qué es:** alertas cuando el tráfico real se desvía
significativamente de lo predicho, en el momento en que pasa, sin
esperar al reporte programado.

**Complejidad:** M.

---

### R-011 · Historial de precisión del modelo (dashboard)

**Qué es:** panel que muestre "de las predicciones que hicimos
hace N días, ¿qué tan cerca estuvieron del valor real que terminó
pasando?" — así se valida si el modelo (Prophet o el motor de
respaldo) es confiable.

**Complejidad:** M. Depende de R-002.

---

### R-014 · Motor de sugerencias v2 con LLM

**Qué es:** las sugerencias de acción preventiva de hoy son
reglas fijas (caída + update reciente → "auditoría de contenido",
etc.). La v2 usaría un LLM para generar sugerencias más
específicas y contextuales.

**Status:** `pending` — documentada sin diseño adicional.

---

## Tema 2 — Producción y confiabilidad

### R-003 · Publicar el OAuth de Google / salir de modo Testing

**Qué es:** la app está hoy en modo **Testing** — el refresh
token expira cada 7 días. Para uso continuo, hay que pasar la
pantalla a **Internal** (si E3 tiene Workspace) o publicar como
**External** (con verificación de Google).

**Bloqueada** por decisión de negocio (ver
[`docs/design-document.md § Decisiones abiertas`](design-document.md#9-decisiones-abiertas)).

**Status:** `pending`.

---

### R-005 · Migración a Postgres + hosting definitivo

**Qué es:** cambiar el `dialect` de Sequelize a Postgres/Neon,
correr migraciones, elegir hosting para Node + Python + BD.
Definido originalmente como Fase 5 del plan.

**Complejidad:** M.

---

### R-004 · Canal de entrega del reporte periódico

**Qué es:** el reporte periódico (cron) ya genera y guarda un
snapshot en `report_snapshots`, pero no se **envía** a nadie
todavía — hay que abrirlo manualmente. Falta canal de entrega
(email o Slack).

**Complejidad:** M. Depende de decisión de canal.

---

### R-007 · Roles de usuario diferenciados (admin/miembro)

**Qué es:** todos los usuarios hoy son `member`. Diferenciar
permisos — solo un admin puede desconectar cuentas de Google o
borrar registros de estrategia de otra persona.

**Complejidad:** S — el modelo `users` ya tiene el campo `rol`,
falta la lógica de permisos por endpoint.

---

## Tema 3 — Integraciones

### R-009 · Notificaciones Slack en tiempo real

**Qué es:** avisar en un canal de Slack cuando se detecta una
alerta nueva, en vez de tener que entrar al dashboard a verla.

**Complejidad:** S. Buen candidato a hacerse junto con R-006 (mismo
disparador).

---

### R-013 · Automatizar la captura de updates de Google

**Qué es:** hoy los updates de Google se registran a mano en
`external_events`. Se automatizaría con scraping/RSS de trackers
públicos.

**Complejidad:** M.

---

### R-015 · Integrar Google Ads / Google Business Profile / backlinks

**Qué es:** ampliar las fuentes de datos más allá de GA4/GSC.
Cada una es su propio proyecto de integración.

**Complejidad:** L (por fuente).

---

## Tema 4 — Colaboración y escala

### R-016 · Soporte multi-cliente

**Qué es:** hoy es explícitamente una herramienta interna. Habilitar
acceso de clientes externos requiere aislar datos por cliente,
permisos, y una capa de branding por cliente.

**Complejidad:** L — cambio de arquitectura, no feature aislada.

**Bloqueada** por decisión de negocio.

---

### R-012 · Exportar reportes a PDF/PPT reutilizando generadores E3

**Qué es:** el proyecto tiene disponibles skills de generación de
PDF/PPT con la identidad de E3 — conectar el snapshot de
`report_snapshots` a esos generadores.

**Complejidad:** S — es integración, no construir un generador.

---

## Tema 5 — Ajuste continuo

### R-008 · Ajuste de umbrales con datos reales

- **Umbral de "caída significativa"** (`ALERT_DROP_THRESHOLD`, hoy
  15%) y **ventana de anticipación** — punto de partida, a
  ajustar con los primeros ciclos de uso real.
- **Mínimo de histórico para predicción confiable**
  (`MIN_HISTORY_DAYS`, hoy 90 días) — mismo criterio.
- **Paleta/tipografía con Manual de Marca E3** — pendiente hasta
  que se comparta un manual formal.

**Status:** `deferred` — no es un hito único, es calibración
continua. No tiene `target_version` propio; se ajusta con cada
uso real.
