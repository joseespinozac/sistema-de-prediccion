# Roadmap — Predictor de Tráfico E3

Estrategia documentada de features futuras, para planificar antes de
implementar. Complementa a [`implementation-plan.md`](implementation-plan.md)
(el plan original, §13/§14 ya listaban varias de estas ideas) y a
[`BITACORA.md`](BITACORA.md) (histórico de lo ya construido).

## Cómo usar este documento

- Cada feature tiene: **qué es**, **por qué importa**, **complejidad**
  (S/M/L), **dependencias**, **preguntas abiertas** y **estado**.
- Prioridad **mixta** (impacto vs. esfuerzo), no un solo eje — así que no leas
  el orden de las secciones como "hacer de arriba a abajo": la tabla resumen
  de abajo es la referencia rápida para decidir qué sigue.
- Cuando una feature pase de "planeada" a "implementada", se mueve su
  entrada correspondiente a [`BITACORA.md`](BITACORA.md) y aquí se marca su
  estado — no se borra de este documento (sirve como registro de qué se
  evaluó y por qué se decidió construirlo).

## Resumen de prioridad (impacto vs. esfuerzo)

| Feature | Impacto | Esfuerzo | Estado |
|---|---|---|---|
| Detector de patrones — v1 reglas (semanal) | Alto | M | ✅ Implementado (ver nota de calibración abajo) |
| Registro de precisión del modelo (real vs. predicho) | Alto | S | 📋 Planeada — gap detectado |
| Publicar OAuth / salir de modo Testing | Alto | S | 📋 Planeada — bloquea uso continuo |
| Canal de entrega del reporte (email/Slack) | Alto | M | 📋 Planeada |
| Migración a Postgres + hosting (Fase 5) | Alto | M | 📋 Planeada |
| Detección de anomalías en tiempo real | Medio | M | 📋 Planeada |
| Roles de usuario (admin/miembro) | Medio | S | 📋 Planeada |
| Ajuste de umbrales con datos reales | Medio | S | 📋 Continuo, no es un hito único |
| Notificaciones Slack en tiempo real | Medio | S | 📋 Planeada |
| Narración con LLM (v2 del detector de patrones) | Medio | M | 📄 Documentada, no implementada |
| Historial de precisión del modelo (dashboard) | Medio | M | 📋 Planeada — depende del registro de precisión |
| Exportar reportes a PDF/PPT (generadores E3) | Medio | S | 📋 Planeada |
| Automatizar captura de updates de Google | Bajo | M | 📋 Planeada |
| Motor de sugerencias v2 con LLM | Bajo | M | 📄 Documentada, no implementada |
| Integrar Google Ads / GBP / backlinks | Bajo | L | 📋 Planeada |
| Soporte multi-cliente | Bajo | L | 📋 Planeada — decisión de negocio primero |

---

## Tema 1 — Inteligencia y análisis

### Detector de patrones (v1 — reglas, granularidad semanal)

**Qué es:** un resumen en palabras de lo que pasó en la gráfica durante el
rango seleccionado — caídas, recuperaciones, picos y tendencias sostenidas —
sin que el usuario tenga que interpretarlo a ojo. Ejemplo real que motivó
esta feature: *"la primera semana de mayo cayeron las sesiones, pero se
recuperaron en la segunda semana."*

**Cómo funciona (algoritmo):**
1. Se agrega el tráfico diario en **semanas de calendario** (lunes–domingo).
2. Para cada semana se calcula una **línea base móvil**: el promedio de las
   últimas 8 semanas anteriores (no incluye la semana actual, para no
   "contaminar" la comparación).
3. Se compara el promedio real de la semana contra esa línea base → un
   **% de desviación**.
4. Si la desviación supera un umbral (±20% por defecto) se marca la semana
   como **caída** o **pico**; si una semana marcada vuelve a estar dentro de
   una banda pequeña (±10%), se marca como **recuperación**.
5. Semanas consecutivas del mismo tipo se fusionan en un solo **episodio**
   (fecha inicio, fecha fin, magnitud).
6. Si un episodio de caída no se recupera en varias semanas, se reclasifica
   como **tendencia sostenida** (no "caída puntual").
7. Cada episodio se cruza con `external_events` (reutilizando la misma
   lógica que ya usa el motor de alertas) — si hay un update de Google o
   evento de mercado registrado cerca de la fecha, se menciona en el texto.
8. Los episodios se redactan con **plantillas** en español (no LLM en v1) y
   se concatenan en un párrafo breve, ordenados cronológicamente.

**Por qué importa:** hoy la única forma de detectar un patrón es mirando la
gráfica manualmente. Esto lo convierte en texto accionable y consistente,
sin depender de que alguien del equipo lo note a tiempo.

**Complejidad:** M — la detección de episodios (afinar umbrales para que no
sea ni ruidosa ni ciega) es lo más laborioso; la narración por plantillas es
rápida una vez detectados los episodios.

**Dependencias:** reutiliza `buildSeries`/`sourceForMetric`
(`predictionClient.js`) y la lógica de cruce con eventos externos
(`alerts.js`) — no se construye de cero.

**Preguntas abiertas:**
- ¿8 semanas de línea base es el tamaño correcto, o debería ajustarse por
  cuenta según cuánto histórico tenga?
- ¿El umbral de 20%/10% debe ser configurable por cuenta (como
  `ALERT_DROP_THRESHOLD`) o queda fijo hasta validar con uso real?

**Estado:** ✅ Implementado (`backend/services/patterns.js`,
`GET /api/accounts/:id/patterns`, botón "Analizar patrones" en el dashboard).

**Nota de calibración (hallazgo real, no teórico):** probado con datos
sintéticos suaves (cuenta demo) da 0 episodios — sin falsos positivos, el
mecanismo funciona limpio. Probado con datos **reales** de la primera cuenta
conectada ("Empeño Facil"), el umbral por defecto (20%) resultó **demasiado
sensible**: casi todo el año quedó cubierto por episodios "sostenidos" con
magnitudes muy grandes (128%–426%), lo cual sugiere que ese sitio tiene una
volatilidad semana a semana genuinamente alta (no es un bug del detector).
**Antes de usarlo con más cuentas reales, conviene subir `PATTERN_DROP_THRESHOLD`
y/o `PATTERN_BASELINE_WEEKS`** y volver a probar — quedó confirmado que ambas
preguntas abiertas de arriba son reales, no hipotéticas.

---

### Narración con LLM (v2 del detector de patrones) — **documentada, no implementada**

**Qué es:** en vez de (o además de) las plantillas fijas de la v1, tomar los
**episodios ya detectados por las reglas** (fechas, tipo, magnitud, evento
relacionado) y pedirle a un modelo de lenguaje que los redacte en un párrafo
más natural y variado — nunca que invente o recalcule los números, solo que
los redacte mejor.

**Por qué separado de la v1:** mismo principio que ya usa el proyecto para
las sugerencias de acción (§3 del plan original: *"reglas, no IA generativa
en v1; LLM queda como mejora futura"*). La detección debe seguir siendo
determinística y auditable — el LLM solo mejora la prosa, nunca decide qué
es un patrón.

**Cómo se implementaría:**
1. El backend arma un JSON estructurado con los episodios detectados (igual
   que hoy los devuelve la v1 por API).
2. Se envía ese JSON a la API de Claude con un prompt que **restringe
   explícitamente** al modelo a usar solo esos datos (fechas y porcentajes
   ya calculados), pidiéndole redactar 1 párrafo natural en español,
   priorizando los 2-3 episodios más relevantes.
3. Un modelo pequeño/económico basta — la tarea es redacción sobre datos ya
   estructurados, no razonamiento complejo.
4. Se guarda el texto generado junto al episodio (para no regenerarlo en
   cada carga de la página) y se muestra con un indicador de que es texto
   generado por IA.

**Complejidad:** M — la parte nueva es el prompt + manejo de la llamada a la
API y su costo/latencia; la detección de episodios ya existe (v1).

**Dependencias:** requiere la v1 ya construida y funcionando; requiere una
API key de Anthropic configurada como variable de entorno adicional.

**Preguntas abiertas:**
- ¿Se regenera en cada visita o se cachea por episodio (recomendado, para
  costo y latencia)?
- ¿Debe quedar como opción activable por cuenta, o reemplaza directamente a
  las plantillas de la v1 una vez validada?

**Estado:** 📄 Documentada — no implementada. Se retoma cuando la v1 esté en
uso real y se valide qué tanto ayuda el texto por plantillas antes de pagarle
costo/latencia a un LLM.

---

### Detección de anomalías en tiempo real

**Qué es:** hoy las alertas solo se generan cuando se corre una predicción
manualmente o vía el cron del reporte periódico. Esta feature dispararía una
alerta en el momento en que el tráfico real se desvía significativamente de
lo predicho, sin esperar al reporte programado (§13 del plan original).

**Por qué importa:** acorta el tiempo entre "algo cambió" y "el equipo se
entera", que es justo el objetivo #1 del proyecto (evitar sorpresas).

**Complejidad:** M — requiere comparar tráfico real contra `predictions` ya
guardadas de forma continua (no solo al generar una predicción nueva).

**Dependencias:** requiere que haya predicciones guardadas recientes para
comparar contra el tráfico real conforme llega.

**Preguntas abiertas:** ¿con qué frecuencia se re-chequea? ¿se necesita un
cron adicional aparte del de reporte, o se integra al mismo?

**Estado:** 📋 Planeada.

---

### Historial de precisión del modelo (dashboard)

**Qué es:** un panel que muestre "de las predicciones que hicimos hace N
días, ¿qué tan cerca estuvieron del valor real que terminó pasando?" — así
se valida si el modelo (Prophet o el motor de respaldo) es confiable.

**⚠️ Gap detectado (no es solo una feature nueva, es deuda pendiente):** el
plan original (§8) pedía explícitamente *"guardar desde el día uno el valor
real observado para el mismo periodo que se predijo, aunque el dashboard sea
v2"* — **esto no se implementó** en las Fases 3–4. Sin ese dato guardado
desde ahora, no se podrá construir este historial más adelante con datos
retroactivos.

**Complejidad:** S para el registro (agregar un campo/proceso que, cuando ya
pase la fecha predicha, guarde el valor real observado); M para el
dashboard visual sobre ese dato.

**Dependencias:** ninguna técnica — es independiente, pero **entre antes se
empiece a registrar, mejor**, porque el histórico de precisión solo crece
hacia adelante desde que se activa.

**Estado:** 📋 Planeada — recomendado priorizar el registro (parte S) pronto,
aunque el dashboard visual (parte M) se deje para después.

---

### Motor de sugerencias v2 con LLM

**Qué es:** hoy las sugerencias de acción preventiva son reglas fijas
(caída + update reciente → "auditoría de contenido", etc., §9.4). La v2
usaría un LLM para generar sugerencias más específicas y contextuales,
considerando más señales a la vez.

**Complejidad:** M. **Dependencias:** las reglas actuales seguirían como
respaldo/fallback. **Estado:** 📄 Documentada en el plan original (§13), sin
diseño adicional todavía — se detalla cuando se priorice.

---

## Tema 2 — Producción y confiabilidad

### Publicar el OAuth de Google / salir de modo Testing

**Qué es:** hoy la app está en modo **Testing** en Google Cloud — el
refresh token expira cada 7 días y hay que reconectar manualmente. Para uso
continuo del equipo, hay que o (a) confirmar que E3 tiene Google Workspace y
pasar la pantalla de consentimiento a **Internal** (sin proceso de
verificación de Google), o (b) publicar la app como **External** (sí
requiere verificación de Google para scopes sensibles, puede tardar).

**Por qué importa:** es el mayor punto de friction operativa hoy — sin esto,
cada cuenta conectada se desconecta sola cada semana.

**Complejidad:** S técnicamente (es config de Google Cloud, no código), pero
depende de una decisión de negocio (§14 del plan: *"¿E3 tiene Workspace?"*).

**Estado:** 📋 Planeada — **bloqueada en una decisión, no en código.**

---

### Migración a Postgres + hosting definitivo (Fase 5 del plan original)

**Qué es:** lo que ya estaba definido como Fase 5 en `implementation-plan.md`
(§12.5): cambiar el `dialect` de Sequelize a Postgres/Neon, correr
migraciones, y elegir hosting para Node + Python + BD.

**Complejidad:** M. **Dependencias:** ninguna técnica (Sequelize ya está
preparado para el salto, §10). **Estado:** 📋 Planeada — pospuesta
intencionalmente desde el plan original, no bloquea el uso actual en local.

---

### Canal de entrega del reporte periódico (email / Slack)

**Qué es:** el reporte periódico (cron) ya genera y guarda un snapshot en BD
(`report_snapshots`), pero no se **envía** a nadie todavía — hay que abrirlo
manualmente vía API/UI. Falta decidir y construir el canal de entrega (§14
del plan original lo deja como decisión abierta).

**Complejidad:** M (email es más simple; Slack requiere una app de Slack
configurada). **Estado:** 📋 Planeada — depende de qué canal se decida.

---

### Roles de usuario diferenciados (admin/miembro)

**Qué es:** hoy todos los usuarios del equipo tienen el mismo rol
(`member`). Se diferenciarían permisos — ej. solo un admin puede desconectar
cuentas de Google o borrar registros de estrategia de otra persona.

**Complejidad:** S — el modelo `users` ya tiene el campo `rol`, falta la
lógica de permisos por endpoint. **Estado:** 📋 Planeada (§13 del plan
original).

---

## Tema 3 — Integraciones

### Notificaciones Slack en tiempo real

**Qué es:** avisar en un canal de Slack cuando se detecta una alerta nueva,
en vez de tener que entrar al dashboard a verla (§13 del plan original).

**Complejidad:** S (un webhook de Slack es simple de integrar). **Estado:**
📋 Planeada — buen candidato a hacerse junto con "detección de anomalías en
tiempo real", ya que ambas comparten el disparador.

---

### Automatizar la captura de updates de Google

**Qué es:** hoy los updates de Google se registran a mano en
`external_events`. Se automatizaría con scraping/RSS de trackers públicos
(§13 del plan original).

**Complejidad:** M (depende de la fuente pública elegida y su estabilidad).
**Estado:** 📋 Planeada.

---

### Integrar Google Ads / Google Business Profile / backlinks (Ahrefs/Semrush)

**Qué es:** ampliar las fuentes de datos más allá de GA4/GSC (§13 del plan
original). Cada una es su propio proyecto de integración (OAuth o API key
propia, modelo de datos nuevo).

**Complejidad:** L (por fuente). **Estado:** 📋 Planeada — sin priorizar
todavía cuál fuente primero; depende de qué necesite el equipo de cuentas.

---

## Tema 4 — Colaboración y escala

### Soporte multi-cliente

**Qué es:** hoy es explícitamente una herramienta interna (fuera de alcance
en v1, §3). Habilitar acceso de clientes externos requiere aislar datos por
cliente, permisos, y probablemente una capa de branding por cliente.

**Complejidad:** L — es un cambio de arquitectura, no una feature aislada.
**Estado:** 📋 Planeada — **requiere decisión de negocio primero** (¿E3
quiere vender esto como producto a clientes, o se queda interno?).

---

### Exportar reportes a PDF/PPT reutilizando generadores E3

**Qué es:** el proyecto ya tiene disponibles skills de generación de PDF/PPT
con la identidad de marca de E3 — se conectaría el snapshot de
`report_snapshots` a esos generadores para producir un entregable
presentable, en vez de solo JSON.

**Complejidad:** S — es integración, no construir un generador nuevo.
**Estado:** 📋 Planeada (§13 del plan original).

---

## Tema 5 — Ajuste continuo (no son "features", son calibración)

- **Umbral de "caída significativa"** (`ALERT_DROP_THRESHOLD`, hoy 15%) y
  **ventana de anticipación** — el plan original (§2, §14) ya advierte que
  son un punto de partida, a ajustar con los primeros ciclos de uso real.
- **Mínimo de histórico para predicción confiable** (`MIN_HISTORY_DAYS`, hoy
  90 días) — mismo criterio, validar con las primeras cuentas reales.
- **Paleta/tipografía con Manual de Marca E3** — pendiente hasta que se
  comparta un manual formal (§11/§14 del plan original).
