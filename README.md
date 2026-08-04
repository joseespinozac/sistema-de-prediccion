# Predictor de Tráfico E3

Herramienta interna del equipo de SEO de E3 para predecir el tráfico de un sitio
(por URL, consulta y canal) usando el histórico de **GA4** y **Search Console**,
cruzarlo con factores externos y dejar trazabilidad de las acciones tomadas.

> Estado actual: **Fases 1 a 4** implementadas — fundaciones + conexión de
> credenciales + dashboard + motor de predicción (Python) + alertas,
> sugerencias, trazabilidad, PageSpeed y reporte periódico (cron). Solo queda
> la Fase 5 (Postgres/hosting de producción).

## Requisitos

- **Node.js 20+** (usa `fetch` nativo y ESM).
- **npm**.
- **Python 3.11+** para el servicio de predicción (Fase 3).

## Puesta en marcha (desarrollo)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno a partir del ejemplo
cp .env.example .env    # en PowerShell: Copy-Item .env.example .env

# 3. Generar las claves locales (sesión y encriptación) y pegarlas en .env
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# 4. Crear la base de datos SQLite y cargar datos de demostración
npm run migrate
npm run seed

# 5. Arrancar el backend (sirve también el frontend)
npm run dev:node
```

### Servicio de predicción (Python)

Para que funcionen las predicciones y alertas, levanta también el servicio
Python (en otra terminal). Los pasos completos están en
[`prediction-service/README.md`](prediction-service/README.md):

```powershell
cd prediction-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:INTERNAL_TOKEN = "el-mismo-INTERNAL_TOKEN-del-.env-de-la-raiz"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Prophet viene comentado por defecto; el servicio usa un motor de respaldo que
no requiere compilación. Para habilitar Prophet: `pip install prophet`.

> **Atajo:** `npm run dev` levanta backend Node + servicio Python juntos con
> `concurrently` (requiere el `.venv` ya creado y el token exportado).

Abre <http://localhost:3001/login.html> e ingresa con el usuario demo:

- **Email:** `demo@e3.com`
- **Contraseña:** `demo1234`

La cuenta demo trae ~180 días de tráfico sintético para ver el dashboard
funcionando **sin** necesidad de conectar Google todavía.

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Las mínimas para
correr el dashboard en local son `SESSION_SECRET` y `ENCRYPTION_KEY`. Las de
Google (`GOOGLE_CLIENT_*`) solo hacen falta para conectar cuentas reales.

## Conectar GA4 + Search Console (credenciales de Google)

El flujo OAuth ya está implementado; solo falta generar las credenciales:

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) y crea (o
   elige) un proyecto.
2. **APIs y servicios → Biblioteca**, habilita:
   - Google Analytics Data API
   - Google Analytics Admin API
   - Search Console API
   - (opcional) PageSpeed Insights API
3. **Pantalla de consentimiento de OAuth**: configúrala como **Internal** si el
   equipo tiene Google Workspace (evita el proceso de verificación de Google
   para scopes sensibles). *Confirmar con Yamilet que existe el Workspace (§14).*
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web.**
   - URI de redirección autorizado:
      `http://localhost:3001/api/auth/google/callback`
5. Copia el `client_id` y el `client_secret` a tu `.env`
   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
6. Reinicia el servidor, entra a **Conectar Google** en la app y sigue el flujo.
7. Ya conectada la cuenta, entra al dashboard y selecciónala: el histórico se
   importa **automáticamente** si detecta que el rango de fechas no está
   cubierto todavía (o usa el botón **"Importar histórico"** para forzar un
   rango específico o re-sincronizar).

Los tokens se guardan **encriptados** (AES-256-GCM) y nunca se exponen al
cliente ni a los logs.

## Estructura del proyecto

```
backend/          API REST JSON (Fastify) + modelos Sequelize + servicios + cron
frontend/         HTML + Tailwind (CDN en dev) + Alpine.js + ApexCharts
prediction-service/  Servicio Python FastAPI (+ Prophet opcional / fallback)
```

## Scripts útiles

| Script | Qué hace |
|---|---|
| `npm run dev:node` | Backend con recarga (`node --watch`) |
| `npm run migrate` | Aplica migraciones (crea/actualiza SQLite) |
| `npm run seed` | Carga usuario y datos demo |
| `npm run seed:undo` | Borra los datos demo |
| `npm run build:css` | Compila Tailwind a `frontend/css/app.css` (producción) |

## Notas de seguridad

- Contraseñas con `bcrypt`; sesión en cookie `httpOnly` + `SameSite=Lax`.
- Tokens OAuth encriptados en reposo; la clave maestra vive solo en
  `ENCRYPTION_KEY` (variable de entorno).
- Ningún secreto se devuelve en respuestas JSON ni se escribe en logs.
