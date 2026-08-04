# Documento de Diseño — Predictor de Tráfico E3

> **Última revisión:** ver `git log` del archivo.
> **Audiencia:** devs que construyen features, reviewers que validan
> PRs, agentes de IA que generan código.
> **Migrado desde:** `implementation-plan.md` (archivado en
> `docs/implementation/archive/implementation-plan-pre-DDD.md`).
> Reorganizado bajo las 10 secciones promulgadas en
> [`ADR-002`](decisions/ADR-002-monolithic-design-doc.md).

## Tabla de contenidos

1. [Resumen y objetivos](#1-resumen-y-objetivos)
2. [Arquitectura](#2-arquitectura)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Servicios externos](#4-servicios-externos)
5. [Motor de predicción](#5-motor-de-predicción)
6. [Seguridad](#6-seguridad)
7. [Convenciones](#7-convenciones)
8. [Restricciones](#8-restricciones)
9. [Decisiones abiertas](#9-decisiones-abiertas)
10. [Diagramas](#10-diagramas)

---

## 1. Resumen y objetivos

### 1.1 Resumen

Herramienta interna para el equipo de SEO de E3 que predice el
tráfico de un sitio (por URL, consulta y canal) usando el histórico
de **GA4** y **Search Console**, cruzándolo con factores externos
(updates de Google, salud técnica, contexto de mercado) y dejando
trazabilidad de las acciones tomadas.

No es una herramienta de cliente. Es de uso interno del equipo E3.

### 1.2 Objetivos y criterio de éxito

| Objetivo | Cómo se mide |
|---|---|
| Evitar sorpresas en caídas de tráfico | % de caídas significativas (definir umbral, ej. >15% semana contra semana) que la herramienta marcó con anticipación (definir ventana, ej. 5-7 días antes) |
| Adelantar acciones preventivas | Número de acciones registradas en el log de estrategia que fueron disparadas por una alerta de la herramienta, no reactivas a la caída ya ocurrida |
| Trazabilidad de la estrategia | Cada predicción relevante tiene al menos una acción o nota asociada en el sistema — no queda "suelta" |

Estos umbrales son un punto de partida sugerido, no una decisión
cerrada. Se ajustan con los primeros ciclos de uso real.

---

## 2. Arquitectura

### 2.1 Decisiones de arquitectura

| Capa | Decisión | Por qué |
|---|---|---|
| Backend | Node.js + Fastify | Expone **solo una API REST en JSON**, sin vistas renderizadas en servidor |
| Frontend | Archivos estáticos (HTML + Tailwind CSS + Alpine.js), servidos por el mismo Fastify vía `@fastify/static` | Nada de SSR. Toda la UI se hidrata vía `fetch()` a los endpoints JSON del backend |
| Interactividad de UI | Alpine.js con `fetch()` dentro de `x-data`/`x-init` | Alpine soporta esto de forma nativa (fetch + `x-for` para listas + `x-show` para estados) sin necesitar React/Vue |
| Estilos | Tailwind CSS | Combo estándar con Alpine |
| ORM | Sequelize | Abstrae el dialecto de BD — permite empezar en SQLite y migrar a Postgres sin reescribir modelos |
| Base de datos — decisión vigente | **SQLite + Sequelize** | Cero fricción para empezar a construir ya; acordado como punto de partida, con cambio previsto a futuro |
| Base de datos — migración futura | Postgres (Neon), cuando se defina el hosting definitivo | Sequelize permite este salto cambiando solo el dialect |
| Conexión de credenciales GA4/GSC | **OAuth2 "Conectar cuenta de Google", iniciado desde la UI** | Reemplaza el Service Account configurado a mano por un desarrollador — cualquier persona del equipo conecta una cuenta desde la interfaz |
| Almacenamiento de esas credenciales | Tokens de OAuth **encriptados en BD** (AES-256-GCM), nunca en texto plano, nunca expuestos al cliente | Ver §6 para el detalle completo |
| Motor de predicción | Servicio Python separado (FastAPI + Prophet), invocado internamente por el backend Node vía HTTP | Node no tiene librerías de forecasting maduras con soporte nativo de estacionalidad + eventos externos; Prophet sí. Ver §5 |
| Autenticación de usuarios del equipo | Sesión con cookie `httpOnly` + `SameSite=Lax` (no JWT en `localStorage`) | Con fetch same-origin, la cookie de sesión es más simple y más segura que manejar tokens del lado del cliente |
| Hosting | Por definir — candidatos ya evaluados: Render (Node + servicio Python) + Neon (Postgres, a futuro) | Pospuesto intencionalmente; no bloquea el desarrollo |

### 2.2 Vista de componentes

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

### 2.3 Funcionalidades v1 (resumen)

1. **Selector de cuenta** — vía fetch a `GET /api/accounts`.
2. **Conectar cuenta de Google (GA4 + GSC) desde la UI** — flujo
   OAuth2 completo, ver §4.
3. **Selector de rango de fechas comparativo** — panel Alpine.js
   que dispara fetch con los parámetros de fecha.
4. **Sugerencias de acciones preventivas** — reglas simples:
   - Predicción de caída + update de Google reciente en
     `external_events` → sugerir auditoría de contenido.
   - Predicción de caída + `technical_health_checks` con status
     distinto de 200 o Core Web Vitals bajo → sugerir auditoría
     técnica.
   - Sin factor externo detectado → sugerir revisión manual, sin
     forzar una causa donde no hay evidencia.
5. **Uso simple** — pantallas con un solo flujo de decisión cada
   una; nada de configuración innecesaria expuesta.
6. **Dashboard** — gráficas (ApexCharts) de histórico vs.
   predicción, alimentadas 100% por fetch a la API; panel de
   alertas activas; top URLs/consultas con mayor cambio
   proyectado.
7. **Reporte periódico** — cron job que corre la predicción de
   todas las cuentas activas y genera un snapshot guardado en BD;
   canal de entrega pendiente de definir (§9).
8. **Autenticación** — login con sesión antes de cualquier vista o
   llamada a la API.

---

## 3. Modelo de datos

11 entidades. Migración con `sequelize-cli` desde el día uno (no
`sync()` como mecanismo principal) para habilitar el salto
SQLite → Postgres sin reescribir esquema.

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
| `report_snapshots` | id, account_id, fecha_generación, payload (json) | Snapshot del reporte periódico (cron, gestionado por `backend/jobs/cron.js`) |

---

## 4. Servicios externos

### 4.1 Flujo OAuth2 de Google (desde la UI)

1. El usuario entra a "Conectar cuenta de Google" dentro de la app.
2. El backend redirige a la pantalla de consentimiento de Google,
   pidiendo los scopes:
   - `https://www.googleapis.com/auth/analytics.readonly` (GA4)
   - `https://www.googleapis.com/auth/webmasters.readonly`
     (Search Console)
3. Google redirige de vuelta a un callback del backend
   (`/api/auth/google/callback`) con un `code`.
4. El backend intercambia ese `code` por un `access_token` +
   `refresh_token`.
5. Ambos tokens se **encriptan** (ver §6.2) y se guardan en la tabla
   `google_connections`, asociados al usuario que conectó y, después,
   a la cuenta/propiedad elegida.
6. El backend usa el token para listar, vía **GA4 Admin API** y
   **Search Console `sites.list`**, qué propiedades/sitios son
   accesibles con esa cuenta de Google — así el usuario elige de una
   lista en vez de escribir IDs a mano.
7. El usuario asocia esa conexión a un `account` (cuenta trackeada
   dentro de la herramienta).

**Nota de configuración:** si E3 tiene Google Workspace, la pantalla
de consentimiento OAuth debe configurarse como **"Internal"** en
Google Cloud Console. Esto evita por completo el proceso de
verificación para scopes sensibles. Ver §9.

### 4.2 Salud técnica del sitio

- **PageSpeed Insights API** (gratuita, no requiere OAuth) para
  Core Web Vitals de las URLs trackeadas.
- Chequeo simple de **status code** (200/3xx/4xx/5xx) sobre las
  mismas URLs.
- Resultado va a `technical_health_checks` y se cruza con
  predicciones de caída para sugerir auditoría técnica.

### 4.3 Updates de Google / contexto de mercado

- **V1:** registro manual en `external_events` — el equipo anota
  fecha y descripción de un update conocido o evento de mercado
  relevante.
- **Futuro:** automatizar con scraping/RSS de trackers públicos
  (ver [`docs/roadmap.md`](roadmap.md)).

---

## 5. Motor de predicción

### 5.1 Por qué Prophet (servicio Python separado)

Facebook/Meta diseñó Prophet específicamente para series de tiempo
de negocio con estacionalidad (semanal, mensual, anual) y con la
capacidad de marcar "eventos" que alteran el comportamiento normal
de la serie — que es exactamente lo que necesitamos para modelar
updates de Google y eventos de mercado. Node no tiene un equivalente
maduro; forzar esto en JavaScript significaría reinventar, mal, lo
que Prophet ya resuelve.

### 5.2 Arquitectura del servicio

- Python 3.11+, framework **FastAPI**, librerías `pandas` +
  `prophet`.
- Expone un único endpoint interno: `POST /predict`. **No es
  público** — solo el backend Node puede llamarlo, autenticado con
  un token compartido (`X-Internal-Token`) que vive en variable de
  entorno de ambos servicios.

### 5.3 Contrato del endpoint `/predict`

**Entrada (JSON):**

```json
{
  "series": [{"fecha": "2026-01-01", "valor": 1450}, ...],
  "eventos_externos": [{"fecha": "2026-03-12", "tipo": "update_google", "descripcion": "Core Update"}],
  "horizonte_dias": 30,
  "nivel_confianza": 0.8
}
```

**Salida (JSON):**

```json
{
  "estado": "ok",
  "prediccion": [{"fecha": "2026-08-05", "yhat": 1510, "yhat_lower": 1420, "yhat_upper": 1600}, ...],
  "componentes": {"tendencia": "...", "estacionalidad_semanal": "..."}
}
```

### 5.4 Proceso interno paso a paso

1. Los datos de `traffic_snapshots` se agregan por día para la
   URL/consulta seleccionada y se formatean a lo que Prophet
   espera (columnas `ds` = fecha, `y` = valor).
2. Los `external_events` del rango se pasan a Prophet como
   **regresores/holidays**: fechas donde el modelo debe considerar
   que algo fuera de lo normal pudo haber ocurrido.
3. **Límite a documentar en la UI:** Prophet solo puede "aprender"
   el efecto de un tipo de evento si ya lo vio ocurrir antes en el
   histórico con datos suficientes alrededor. Si es la primera vez
   que se registra ese tipo de evento, el modelo muestra la
   predicción base, sin ajuste por ese evento — no se debe prometer
   al usuario que el modelo "sabe" el efecto de un update que nunca
   vivió antes en los datos.
4. Se ajusta (`fit`) el modelo con la serie + eventos.
5. Se genera el forecast para el horizonte pedido, con `yhat`
   (predicción central) y `yhat_lower`/`yhat_upper` (banda de
   confianza).
6. El backend Node recibe esto, lo guarda en `predictions`, y
   evalúa si dispara una `alert` según el umbral configurado.

### 5.5 Cold start

Si hay menos de ~90 días de histórico para esa URL/consulta, el
backend Node **no llama** al servicio de predicción — regresa
directamente "datos insuficientes para predicción confiable". Esto
es una decisión de producto: mejor no mostrar número que mostrar
uno poco confiable.

### 5.6 Registro de precisión

Cada vez que se genera una predicción, guardar también, cuando ya
pase el tiempo, el valor real observado para ese mismo periodo.
Esto no se usa en v1 para nada visible, pero sin este dato desde
el día uno no se podrá construir después el "historial de
precisión del modelo" (ver
[`docs/roadmap.md`](roadmap.md)).

**Estado:** registrado en ROADMAP como R-006, pendiente de
implementación.

### 5.7 Nota de despliegue

Prophet depende de `cmdstanpy`/Stan, que requiere compilación al
instalar — puede alargar el build del servicio Python. Si esto da
problemas en el hosting elegido, la alternativa de respaldo es
`statsmodels` con SARIMAX (menos automático con estacionalidad y
eventos, pero sin dependencias pesadas de compilación).

---

## 6. Seguridad

### 6.1 Encriptación de credenciales (AES-256-GCM)

- Los `access_token`/`refresh_token` se encriptan con **AES-256-GCM**
  antes de escribirse en la base de datos.
- La clave maestra de encriptación vive **solo** en una variable de
  entorno del servidor (`ENCRYPTION_KEY`) — nunca en el repositorio,
  nunca en la base de datos.
- La desencriptación ocurre **solo en memoria**, en el momento
  exacto de hacer la llamada a la API de Google. El token nunca se
  envía al cliente en ninguna respuesta JSON (ni siquiera al usuario
  que lo conectó).

### 6.2 Renovación de tokens

Un middleware/servicio revisa si el `access_token` está por vencer
antes de cada llamada y usa el `refresh_token` para pedir uno nuevo
a Google, re-encriptando y actualizando el registro.

### 6.3 Revocación

Debe existir una acción "Desconectar cuenta" que (a) llame al
endpoint de revocación de Google y (b) borre el registro
encriptado de la BD — no basta con borrar de la BD sin revocar en
Google.

### 6.4 Auditoría de conexiones

Guardar quién conectó cada cuenta y cuándo (`connected_by`,
`connected_at`), para trazabilidad si algo falla.

### 6.5 Autenticación de usuarios del equipo

- Contraseñas con `bcrypt` (vía `bcryptjs` para compat ESM puro);
  nunca texto plano.
- Sesión en cookie `httpOnly` + `SameSite=Lax`. (No JWT en
  `localStorage` — fetch same-origin hace cookie más simple y más
  segura.)
- Rate-limiting en endpoints de autenticación para evitar fuerza
  bruta.
- En producción: cookie `Secure` además de `httpOnly`.

---

## 7. Convenciones

### 7.1 UI

Los patrones de UI (tokens de color, tipografía, espaciado,
componentes recurrentes, reglas de copy) viven en
[`docs/design-system.md`](design-system.md), no aquí.

Resumen de los lineamientos clave:

- Tono: profesional pero accesible.
- Estados de carga y error explícitos en cada `fetch` (spinner
  mientras llega el JSON, mensaje claro si la API falla).
- Jerarquía visual clara entre histórico (línea sólida) y
  predicción (punteada); banda de confianza sombreada.
- Paleta y tipografía: pendientes hasta que se comparta el Manual
  de Marca E3 (§9).

### 7.2 Idioma

- **UI:** todo en español (es-MX).
- **Código:** variables, archivos, mensajes de consola y logs en
  inglés.

### 7.3 Commits

Format: `<type>(<scope>): <summary>` (English, imperative, ≤72
chars on first line).

- **type:** `feat`, `fix`, `refactor`, `docs`, `chore`, `test`,
  `style`.
- **scope:** `backend`, `frontend`, `prediction-service`, `docs`,
  `deps`, `infra`.

Atomic commits — una unidad lógica por commit. No mezclar backend
+ frontend en el mismo commit salvo que el cambio no tenga sentido
sin ambos (si no, partir).

Referenciar el slug del spec o wave cuando aplique (ej.
`feat(backend): detector de patrones (v1 reglas)`).

### 7.4 Mensajes de error de integración

Logging de errores de integración (fallo de GA4/GSC, fallo del
servicio de predicción) visible para el equipo, **nunca**
incluyendo el contenido de un token.

---

## 8. Restricciones

### 8.1 Fuera de alcance (v1)

- Acceso de clientes externos (multi-tenant).
- Ejecución automática de acciones (todo es sugerencia, nada se
  autoaplica).
- Fuentes de datos distintas a GA4/GSC (Ads, GBP, backlinks) —
  quedan en futuras funcionalidades.
- Recomendaciones generadas por LLM — v1 usa reglas; LLM queda
  como mejora futura.

### 8.2 Requisitos no funcionales

| Categoría | Requisito |
|---|---|
| Seguridad | Ningún secreto (tokens OAuth, claves) se expone al cliente en ninguna respuesta JSON, log visible o mensaje de error. |
| Seguridad | Encriptación AES-256-GCM para tokens en reposo; clave maestra solo en variable de entorno del servidor. |
| Performance | Cacheo de llamadas a GA4/GSC en `traffic_snapshots` — no se repite una llamada por un rango ya importado. |
| Mantenibilidad | Migraciones desde el día uno con `sequelize-cli` (no `sync()` como mecanismo principal) — habilita SQLite → Postgres sin reescribir esquema. |
| Seguridad | Cookies de sesión `httpOnly` + `Secure` (en producción) + `SameSite=Lax` para mitigar CSRF en un modelo API same-origin. |
| Seguridad | Rate limiting básico en endpoints de autenticación. |
| Observabilidad | Logging de errores de integración visible para el equipo, sin incluir el contenido de un token. |
| Seguridad | Contraseñas con hash `bcrypt`, nunca texto plano. |
| UX | Mobile no es prioridad v1 (herramienta de escritorio para el equipo), pero el layout no debe romperse en pantallas medianas (laptop de 13"). |

---

## 9. Decisiones abiertas

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

---

## 10. Diagramas

Los diagramas formales del sistema (ER de la BD, secuencia del
flujo OAuth, secuencia del flujo de predicción) vivirán aquí
cuando se generen. Por ahora, la vista de componentes en §2.2
sirve como referencia topológica.

Herramientas candidatas para diagramas futuros: dbdiagram.io,
Draw.io, Mermaid (incrustado en Markdown).
