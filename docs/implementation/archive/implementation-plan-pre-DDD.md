# ARCHIVED — superseded by `../../design-document.md`

> Este archivo se conserva solo como referencia histórica del plan de implementación original antes de la adopción de Documentation-Driven Development ([`ADR-000`](../../decisions/ADR-000-ddd-adoption.md)). Su contenido fue reorganizado bajo las 10 secciones de [`../../design-document.md`](../../design-document.md) (ver [`ADR-002`](../../decisions/ADR-002-monolithic-design-doc.md)).
>
> NO edites este archivo. Para el estado actual del sistema, consulta [`../../design-document.md`](../../design-document.md).

---

# Implementation Plan — Predictor de Tráfico E3 (nombre provisional)

> **Propósito de este documento:** fuente de verdad para el agente de código que va a construir esta aplicación. Cualquier decisión de arquitectura, alcance o prioridad debe salir de aquí. Si el agente encuentra una ambigüedad no cubierta en este doc, debe detenerse y preguntar antes de asumir.
>
> Versión: 0.2 · Autor: Yamilet (Head of SEO, Consultoría E3) · Última actualización: 2026-08-04
>
> **Cambios en esta versión:** se elimina el SSR (Fastify+EJS) — el backend ahora es una API REST en JSON pura, consumida por el frontend vía `fetch()`. Se agrega la capacidad de conectar credenciales de GA4/GSC desde la propia UI (OAuth2), con manejo de encriptación. Se detallan las fases en tareas pequeñas. Se explica a fondo el motor de predicción en Python.

---

## 1. Resumen ejecutivo

Herramienta interna para el equipo de SEO de E3 que predice el tráfico de un sitio (por URL, consulta y canal de origen) usando el histórico conectado vía GA4 y Search Console. El objetivo no es solo mostrar una gráfica de proyección: es anticipar picos y caídas de tráfico, cruzar esa proyección con factores externos (updates de Google, salud técnica del sitio, contexto de mercado) y dejar trazabilidad de qué acción se tomó en respuesta a qué predicción.

No es una herramienta de cliente. Es de uso interno del equipo E3.

## 2. Objetivos y criterio de éxito

| Objetivo | Cómo se mide |
|---|---|
| Evitar sorpresas en caídas de tráfico | % de caídas significativas (definir umbral, ej. >15% semana contra semana) que la herramienta marcó con anticipación (definir ventana, ej. 5-7 días antes) |
| Adelantar acciones preventivas | Número de acciones registradas en el log de estrategia que fueron disparadas por una alerta de la herramienta, no reactivas a la caída ya ocurrida |
| Trazabilidad de la estrategia | Cada predicción relevante tiene al menos una acción o nota asociada en el sistema — no queda "suelta" |

Estos umbrales son un punto de partida sugerido, no una decisión cerrada. Se ajustan con los primeros ciclos de uso real.

## 3. Alcance

### Dentro de alcance (v1)
- Conexión a GA4 y Search Console vía OAuth2, iniciada desde la UI.
- Selección de cuenta/propiedad, URLs a trackear, consultas y canal de origen.
- Selección de rango de fechas comparativo.
- Motor de predicción de tráfico (por URL y por consulta).
- Cruce con factores externos: updates de Google (registro manual v1), salud técnica básica (ver §6).
- Dashboard con histórico + predicción, consumiendo una API JSON.
- Sugerencias base de acciones preventivas (reglas, no IA generativa en v1).
- Reporte generado cada determinado tiempo (cron) con el estado de las cuentas trackeadas.
- Login con credenciales para el equipo.
- Registro de acciones/estrategia (trazabilidad).

### Fuera de alcance (v1) — ver §13 para roadmap futuro
- Acceso de clientes externos (multi-tenant).
- Ejecución automática de acciones (todo es sugerencia, nada se autoaplica).
- Fuentes de datos distintas a GA4/GSC (Ads, GBP, backlinks) — quedan en futuras funcionalidades.
- Recomendaciones generadas por LLM — v1 usa reglas; LLM queda como mejora futura.

## 4. Decisiones de arquitectura

| Capa | Decisión | Por qué |
|---|---|---|
| Backend | Node.js + Fastify | Se mantiene — ahora expone **solo una API REST en JSON**, sin vistas renderizadas en servidor |
| Frontend | Archivos estáticos (HTML + Tailwind CSS + Alpine.js), servidos por el mismo Fastify vía `@fastify/static` | **Cambio pedido:** nada de SSR. Toda la UI se hidrata vía `fetch()` a los endpoints JSON del backend |
| Interactividad de UI | Alpine.js con `fetch()` dentro de `x-data`/`x-init` | Alpine soporta esto de forma nativa (fetch + `x-for` para listas + `x-show` para estados) sin necesitar React/Vue |
| Estilos | Tailwind CSS | Sin cambios — combo estándar con Alpine |
| ORM | Sequelize | Abstrae el dialecto de BD — permite empezar en SQLite y migrar a Postgres sin reescribir modelos |
| Base de datos — decisión vigente | **SQLite + Sequelize** | Cero fricción para empezar a construir ya; acordado como punto de partida, con cambio previsto a futuro |
| Base de datos — migración futura | Postgres (Neon), cuando se defina el hosting definitivo | Sequelize permite este salto cambiando solo el dialect |
| Conexión de credenciales GA4/GSC | **OAuth2 "Conectar cuenta de Google", iniciado desde la UI** | Reemplaza el Service Account configurado a mano por un desarrollador — cualquier persona del equipo conecta una cuenta desde la interfaz |
| Almacenamiento de esas credenciales | Tokens de OAuth **encriptados en BD** (AES-256-GCM), nunca en texto plano, nunca expuestos al cliente | Ver §6 para el detalle completo |
| Motor de predicción | Servicio Python separado (FastAPI + Prophet), invocado internamente por el backend Node vía HTTP | Node no tiene librerías de forecasting maduras con soporte nativo de estacionalidad + eventos externos; Prophet sí. Ver §8 |
| Autenticación de usuarios del equipo | Sesión con cookie `httpOnly` + `SameSite=Lax` (no JWT en `localStorage`) | Con fetch same-origin, la cookie de sesión es más simple y más segura que manejar tokens del lado del cliente |
| Hosting | Por definir — candidatos ya evaluados: Render (Node + servicio Python) + Neon (Postgres, a futuro) | Pospuesto intencionalmente; no bloquea el desarrollo |

## 5. Arquitectura del sistema (vista de componentes)

```
┌───────────────────────────────────────────────────────────────┐
│  Navegador                                                     │
│  Frontend estático (HTML + Tailwind + Alpine.js)                │
│  Todo dato viene de fetch() a la API JSON — nada renderizado    │
│  por el servidor                                                │
└───────────────────────────┬────────────────────────────────────┘
                            │ fetch() → JSON
┌───────────────────────────▼────────────────────────────────────┐
│  Backend Node.js (Fastify) — API REST pura                     │
│  - Autenticación / sesión (cookie httpOnly)                     │
│  - Endpoints JSON (/api/...)                                     │
│  - Flujo OAuth2 (conectar/renovar/revocar cuentas de Google)     │
│  - Encriptación/desencriptación de tokens en memoria             │
│  - Orquestación: llama a GA4/GSC, guarda en BD, llama al         │
│    servicio de predicción, arma reportes                        │
└───────┬───────────────────────┬─────────────────────┬──────────┘
        │                       │                     │
┌───────▼───────┐   ┌───────────▼───────────┐  ┌──────▼──────────┐
│ GA4 Data API   │   │ Search Console API     │  │ Servicio Python  │
│ + GA4 Admin API│   │                        │  │ (predicción)     │
│ (vía OAuth2,   │   │ (vía OAuth2, mismo     │  │ FastAPI + Prophet│
│ tokens por     │   │ flujo)                 │  │ (solo accesible  │
│ cuenta)        │   │                        │  │ internamente)    │
└────────────────┘   └────────────────────────┘  └──────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │ Base de datos      │
                  │ SQLite (ahora) /   │
                  │ Postgres (futuro)  │
                  └────────────────────┘
```

## 6. Integraciones externas y seguridad de credenciales

### 6.1 Flujo de conexión (OAuth2 desde la UI)

1. El usuario entra a "Conectar cuenta de Google" dentro de la app.
2. El backend redirige a la pantalla de consentimiento de Google, pidiendo los scopes:
   - `https://www.googleapis.com/auth/analytics.readonly` (GA4)
   - `https://www.googleapis.com/auth/webmasters.readonly` (Search Console)
3. Google redirige de vuelta a un callback del backend (`/api/auth/google/callback`) con un `code`.
4. El backend intercambia ese `code` por un `access_token` + `refresh_token`.
5. Ambos tokens se **encriptan** (ver §6.2) y se guardan en la tabla `google_connections`, asociados al usuario que conectó y, después, a la cuenta/propiedad elegida.
6. El backend usa el token para listar, vía **GA4 Admin API** y **Search Console `sites.list`**, qué propiedades/sitios son accesibles con esa cuenta de Google — así el usuario elige de una lista en vez de escribir IDs a mano.
7. El usuario asocia esa conexión a un `account` (cuenta trackeada dentro de la herramienta).

**Nota importante de configuración (no técnica, operativa):** si el equipo E3 tiene Google Workspace, la pantalla de consentimiento OAuth debe configurarse como **"Internal"** en Google Cloud Console. Esto evita por completo el proceso de verificación de Google para scopes sensibles (que puede tardar días/semanas si se configura como "External"). Esto es una asunción que debe confirmarse — ver §14.

### 6.2 Encriptación de credenciales

- Los `access_token`/`refresh_token` se encriptan con **AES-256-GCM** antes de escribirse en la base de datos.
- La clave maestra de encriptación vive **solo** en una variable de entorno del servidor (`ENCRYPTION_KEY`) — nunca en el repositorio, nunca en la base de datos.
- La desencriptación ocurre **solo en memoria**, en el momento exacto de hacer la llamada a la API de Google. El token nunca se envía al cliente en ninguna respuesta JSON (ni siquiera al usuario que lo conectó).
- Renovación: un middleware/servicio revisa si el `access_token` está por vencer antes de cada llamada y usa el `refresh_token` para pedir uno nuevo a Google, re-encriptando y actualizando el registro.
- Revocación: debe existir una acción "Desconectar cuenta" que (a) llame al endpoint de revocación de Google y (b) borre el registro encriptado de la BD — no basta con borrar de la BD sin revocar en Google.
- Auditoría mínima: guardar quién conectó cada cuenta y cuándo (`connected_by`, `connected_at`), para trazabilidad si algo falla.

### 6.3 Salud técnica del sitio

- V1: integración con **PageSpeed Insights API** (gratuita, no requiere OAuth) para Core Web Vitals de las URLs trackeadas, más un chequeo simple de status code (200/3xx/4xx/5xx).

### 6.4 Updates de Google / contexto de mercado

- V1: registro manual en la tabla `external_events` — el equipo anota fecha y descripción de un update conocido o evento de mercado relevante.
- Futuro: automatizar con scraping/RSS de trackers públicos (ver §13).

## 7. Modelo de datos (entidades tentativas)

| Entidad | Campos clave | Notas |
|---|---|---|
| `users` | id, email, password_hash, rol | Rol único en v1 ("member"); roles diferenciados quedan en futuro |
| `accounts` | id, nombre, ga4_property_id, gsc_site_url | Una cuenta = un sitio/marca trackeado |
| `google_connections` | id, account_id, user_id (quién conectó), access_token_encrypted, refresh_token_encrypted, expires_at, scopes, connected_at | Credenciales OAuth encriptadas — nunca se exponen al cliente |
| `tracked_urls` | id, account_id, url, activo | URLs seleccionadas para trackeo |
| `tracked_queries` | id, account_id, query, activo | Consultas seleccionadas para trackeo |
| `traffic_snapshots` | id, account_id, url_id (nullable), query_id (nullable), fecha, canal_origen, clics, impresiones, sesiones, fuente (ga4/gsc) | Histórico crudo importado |
| `technical_health_checks` | id, account_id, url_id, fecha, status_code, core_web_vitals_score | Resultado de PageSpeed/status checks |
| `external_events` | id, fecha, tipo (update_google / mercado), descripción, account_id (nullable si aplica a todos) | Factores externos registrados |
| `predictions` | id, account_id, url_id/query_id, fecha_generación, periodo_predicho_inicio, periodo_predicho_fin, valores_predichos (json), intervalo_confianza | Resultado del motor de predicción |
| `alerts` | id, prediction_id, tipo (caida/pico), severidad, fecha_detectada, resuelta (bool) | Alertas generadas a partir de una predicción |
| `strategy_log` | id, alert_id (nullable), account_id, fecha, acción_tomada, resultado_observado, autor_id | Trazabilidad — el corazón del objetivo #3 |

## 8. Motor de predicción — cómo funciona (Python)

**Por qué un servicio aparte, y por qué Prophet:** Facebook/Meta diseñó Prophet específicamente para series de tiempo de negocio con estacionalidad (semanal, mensual, anual) y con la capacidad de marcar "eventos" que alteran el comportamiento normal de la serie — que es exactamente lo que necesitamos para modelar updates de Google y eventos de mercado. Node no tiene un equivalente maduro; forzar esto en JavaScript significaría reinventar, mal, lo que Prophet ya resuelve.

**Arquitectura del servicio:**
- Python 3.11+, framework **FastAPI**, librerías `pandas` + `prophet`.
- Expone un único endpoint interno: `POST /predict`. **No es público** — solo el backend Node puede llamarlo, autenticado con un token compartido (`X-Internal-Token`) que vive en variable de entorno de ambos servicios.

**Contrato del endpoint `/predict`:**

Entrada (JSON):
```json
{
  "series": [{"fecha": "2026-01-01", "valor": 1450}, ...],
  "eventos_externos": [{"fecha": "2026-03-12", "tipo": "update_google", "descripcion": "Core Update"}],
  "horizonte_dias": 30,
  "nivel_confianza": 0.8
}
```

Salida (JSON):
```json
{
  "estado": "ok",
  "prediccion": [{"fecha": "2026-08-05", "yhat": 1510, "yhat_lower": 1420, "yhat_upper": 1600}, ...],
  "componentes": {"tendencia": "...", "estacionalidad_semanal": "..."}
}
```

**Proceso interno paso a paso:**
1. Los datos de `traffic_snapshots` se agregan por día para la URL/consulta seleccionada y se formatean a lo que Prophet espera (columnas `ds` = fecha, `y` = valor).
2. Los `external_events` del rango se pasan a Prophet como **regresores/holidays**: fechas donde el modelo debe considerar que algo fuera de lo normal pudo haber ocurrido.
3. **Límite importante a documentar en la UI:** Prophet solo puede "aprender" el efecto de un tipo de evento si ya lo vio ocurrir antes en el histórico con datos suficientes alrededor. Si es la primera vez que se registra ese tipo de evento, el modelo muestra la predicción base, sin ajuste por ese evento — no se debe prometer al usuario que el modelo "sabe" el efecto de un update que nunca vivió antes en los datos.
4. Se ajusta (`fit`) el modelo con la serie + eventos.
5. Se genera el forecast para el horizonte pedido, con `yhat` (predicción central) y `yhat_lower`/`yhat_upper` (banda de confianza).
6. El backend Node recibe esto, lo guarda en `predictions`, y evalúa si dispara una `alert` según el umbral configurado.

**Cold start:** si hay menos de ~90 días de histórico para esa URL/consulta, el backend Node **no llama** al servicio de predicción — regresa directamente "datos insuficientes para predicción confiable". Esto es una decisión de producto: mejor no mostrar número que mostrar uno poco confiable.

**Registro de precisión (preparar desde ya, aunque el dashboard sea v2):** cada vez que se genera una predicción, guardar también, cuando ya pase el tiempo, el valor real observado para ese mismo periodo. Esto no se usa en v1 para nada visible, pero sin este dato desde el día uno no se podrá construir después el "historial de precisión del modelo" (ver §13).

**Nota de despliegue:** Prophet depende de `cmdstanpy`/Stan, que requiere compilación al instalar — puede alargar el build del servicio Python. Si esto da problemas en el hosting elegido, la alternativa de respaldo es `statsmodels` con SARIMAX (menos automático con estacionalidad y eventos, pero sin dependencias pesadas de compilación).

## 9. Funcionalidades v1

1. **Selector de cuenta** — vía fetch a `GET /api/accounts`.
2. **Conectar cuenta de Google (GA4 + GSC) desde la UI** — flujo OAuth2 completo, ver §6.
3. **Selector de rango de fechas comparativo** — panel Alpine.js que dispara fetch con los parámetros de fecha.
4. **Sugerencias de acciones preventivas** — reglas simples:
   - Predicción de caída + update de Google reciente en `external_events` → sugerir auditoría de contenido.
   - Predicción de caída + `technical_health_checks` con status distinto de 200 o Core Web Vitals bajo → sugerir auditoría técnica.
   - Sin factor externo detectado → sugerir revisión manual, sin forzar una causa donde no hay evidencia.
5. **Uso simple** — pantallas con un solo flujo de decisión cada una; nada de configuración innecesaria expuesta.
6. **Dashboard** — gráficas (ApexCharts) de histórico vs. predicción, alimentadas 100% por fetch a la API; panel de alertas activas; top URLs/consultas con mayor cambio proyectado.
7. **Reporte periódico** — cron job que corre la predicción de todas las cuentas activas y genera un snapshot guardado en BD; canal de entrega pendiente de definir (§14).
8. **Autenticación** — login con sesión antes de cualquier vista o llamada a la API.

## 10. Requisitos no funcionales

- **Ningún secreto (tokens OAuth, claves) se expone al cliente** en ninguna respuesta JSON, log visible, o mensaje de error.
- Encriptación AES-256-GCM para tokens en reposo; clave maestra solo en variable de entorno del servidor.
- Cacheo de llamadas a GA4/GSC en `traffic_snapshots` — no se repite una llamada por un rango ya importado.
- Migraciones desde el día uno con `sequelize-cli` (no `sync()` como mecanismo principal) — esto habilita el salto SQLite → Postgres sin reescribir esquema.
- Cookies de sesión `httpOnly` + `Secure` (en producción) + `SameSite=Lax` para mitigar CSRF en un modelo de API same-origin.
- Rate limiting básico en endpoints de autenticación (evitar fuerza bruta sobre login).
- Logging de errores de integración (fallo de GA4/GSC, fallo del servicio de predicción) visible para el equipo, nunca incluyendo el contenido de un token.
- Contraseñas con hash `bcrypt`, nunca texto plano.

## 11. Lineamientos de UI/UX

- Tono: profesional pero accesible — herramienta de trabajo diario del equipo, no pieza de venta a cliente.
- Al ser una app 100% impulsada por fetch, cuidar explícitamente los estados de carga y error en cada pantalla (skeleton/spinner mientras llega el JSON, mensaje claro si la API falla) — con SSR esto era menos crítico porque el HTML ya llegaba armado; ahora es responsabilidad del frontend manejarlo bien.
- Jerarquía visual clara entre "lo que ya pasó" (histórico) y "lo que se proyecta" (predicción) — línea sólida vs. punteada, banda de confianza sombreada.
- Librería de gráficas: **ApexCharts** — maneja series de tiempo, bandas de confianza y anotaciones (marcar en la gráfica la fecha de un update de Google).
- Paleta y tipografía: si existe un Manual de Marca E3 formal, debe usarse como fuente principal — no se encontró uno cargado en esta sesión, queda abierto hasta que se comparta.
- Mobile: no es prioridad v1 (herramienta de escritorio para el equipo), pero el layout no debe romperse en pantallas medianas (laptop de 13").

## 12. Roadmap por fases, desglosado en tareas

### Fase 1 — Fundaciones + conexión de credenciales
1.1 Setup del proyecto Node.js + Fastify (estructura de carpetas, linting, variables de entorno).
1.2 Modelo de datos inicial en Sequelize + SQLite (`users`, `accounts`, `google_connections`) + primera migración con `sequelize-cli`.
1.3 Sistema de autenticación de usuarios del equipo: registro/login, sesión con cookie `httpOnly`.
1.4 Módulo de encriptación reutilizable (`encrypt()`/`decrypt()`, AES-256-GCM, key desde variable de entorno).
1.5 Registrar proyecto OAuth en Google Cloud Console: habilitar GA4 Data API + GA4 Admin API + Search Console API, configurar pantalla de consentimiento como "Internal" (ver nota §6.1 y decisión abierta §14), generar `client_id`/`client_secret`.
1.6 Endpoint `GET /api/auth/google/connect` (inicia OAuth) + `GET /api/auth/google/callback` (intercambia `code` por tokens, encripta, guarda en `google_connections`).
1.7 Endpoint `GET /api/google/properties` — lista propiedades GA4 y sitios GSC accesibles con el token conectado.
1.8 UI: pantalla "Conectar cuenta de Google" + selector de propiedad/sitio tras la conexión.
1.9 Endpoint + job de ingesta inicial: traer histórico de GA4/GSC para una cuenta recién conectada, guardarlo en `traffic_snapshots`.
1.10 Servicio de renovación de `access_token` usando `refresh_token` antes de cada llamada vencida.

### Fase 2 — Dashboard básico (API JSON + Alpine.js)
2.1 Definir y documentar contratos de API (`GET /api/accounts`, `GET /api/accounts/:id/traffic`, etc.).
2.2 Frontend: shell HTML + Tailwind — páginas de login, selector de cuenta, dashboard.
2.3 Selector de cuenta (Alpine.js + fetch a `/api/accounts`).
2.4 Selector de URLs/consultas a trackear por cuenta (checkboxes, persistido vía API).
2.5 Panel de rango de fechas comparativo (date range picker + fetch con parámetros).
2.6 Gráfica de histórico con ApexCharts, alimentada por `/api/accounts/:id/traffic`.
2.7 Manejo explícito de estados de carga/error en cada fetch (ver §11).

### Fase 3 — Motor de predicción
3.1 Setup del servicio Python (FastAPI + Prophet), estructura de carpetas, entorno de build.
3.2 Endpoint interno `POST /predict` (contrato detallado en §8).
3.3 Autenticación interna Node ↔ Python vía token compartido, servicio nunca expuesto públicamente.
3.4 Backend Node: servicio que arma el payload desde `traffic_snapshots` + `external_events` y llama al servicio Python.
3.5 Guardado del resultado en `predictions`.
3.6 Lógica de cold start (<90 días de histórico → "datos insuficientes", sin llamar al modelo).
3.7 Endpoint JSON para que el frontend pida la predicción ya calculada de una cuenta/URL/rango.
3.8 UI: overlay de la predicción sobre la gráfica de histórico (línea proyectada + banda de confianza).

### Fase 4 — Alertas, acciones preventivas, trazabilidad, reporte periódico
4.1 Reglas de detección de alerta sobre `predictions` → `alerts` (umbral configurable).
4.2 Motor de sugerencias basado en reglas (cruce con `external_events` y `technical_health_checks`).
4.3 UI: panel de alertas activas + sugerencia asociada.
4.4 CRUD de `strategy_log`: registrar acción tomada, resultado observado, ligado a una alerta.
4.5 Cron job que corre la predicción de todas las cuentas activas periódicamente.
4.6 Generación de snapshot de reporte + canal de entrega (definir en §14).
4.7 Integración PageSpeed Insights API + chequeo de status code → `technical_health_checks`.
4.8 UI/endpoint para registrar `external_events` manualmente.

### Fase 5 — Pulido y producción
5.1 Migración de SQLite a Postgres (Neon): cambiar `dialect` en Sequelize, correr migraciones.
5.2 Configurar hosting definitivo (Node + Python + BD).
5.3 Ajuste de UI/UX final (paleta/tipografía con Manual de Marca E3, si se comparte).
5.4 Ajuste de umbrales de alerta y mínimo de histórico con datos reales de uso.
5.5 Endpoint/UI para desconectar una cuenta de Google (revocar token + borrar registro).
5.6 Revisión de seguridad final: confirmar que ningún token/secreto se expone al cliente ni a logs.

## 13. Futuras funcionalidades (fuera de v1)

- Notificaciones en tiempo real vía Slack cuando se detecta una alerta.
- Roles de usuario diferenciados (admin/miembro).
- Detección automática de anomalías (alerta cuando el tráfico real se desvía significativamente de lo predicho, en cualquier momento, no solo en el reporte programado).
- Automatización de la captura de updates de Google (scraping/RSS de trackers públicos en vez de registro manual).
- Integración de fuentes adicionales: Google Ads, Google Business Profile, herramientas de backlinks (Ahrefs/Semrush API).
- Motor de sugerencias v2 asistido por LLM.
- Exportación de reportes a PDF/PPT reutilizando los generadores E3 ya existentes en el equipo.
- Historial de precisión del modelo — dashboard sobre el dato que ya se empieza a guardar desde §8.
- Soporte multi-cliente (hoy explícitamente fuera de alcance).

## 14. Riesgos y decisiones abiertas

| Punto | Estado | Quién decide |
|---|---|---|
| Postgres vs. MySQL (para cuando se migre de SQLite) | Resuelto: Postgres, por consistencia con Neon. SQLite + Sequelize es la decisión vigente para construir ahora | Cerrado, salvo razón concreta para MySQL |
| ¿E3 tiene Google Workspace para configurar OAuth como "Internal"? | Asumido que sí — de no ser así, se necesita el proceso de verificación de Google para scopes sensibles, que puede tardar días/semanas | Yamilet — confirmar dominio de Workspace |
| Login propio vs. SSO Google Workspace para usuarios del equipo (distinto del OAuth de GA4/GSC) | No definido | Yamilet |
| Canal de entrega del reporte periódico (email/Slack/dashboard únicamente) | No definido | Yamilet |
| Umbral de "caída significativa" y ventana de anticipación | Sugerido 15% / 5-7 días como punto de partida | Se ajusta con uso real |
| Mínimo de histórico para predicción confiable | Sugerido 90 días | Validar con datos reales de las primeras cuentas |
| Hosting definitivo | Pospuesto intencionalmente | Yamilet, no bloquea desarrollo |
| Manual de Marca E3 para UI | No compartido en esta sesión | Yamilet, si existe |
