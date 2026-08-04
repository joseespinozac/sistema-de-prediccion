# Servicio de predicción (Python + FastAPI)

Servicio interno que genera el forecast de tráfico. El backend Node lo llama
por HTTP (`POST /predict`) autenticado con el header `X-Internal-Token`. **No
debe exponerse públicamente.**

## Requisitos

- Python 3.11+
- Las variables `INTERNAL_TOKEN` (idéntica a la del backend) — se lee del entorno.

## Instalación (Windows / PowerShell)

```powershell
# Desde la raíz del proyecto
cd prediction-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> Si `Activate.ps1` falla por políticas de ejecución, corre una vez:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

## Motor Prophet vs. fallback

Por defecto **Prophet está comentado** en `requirements.txt`. El servicio corre
con un motor de respaldo (tendencia lineal + estacionalidad semanal) que no
requiere compilación. Es funcional y suficiente para validar el flujo completo.

Para usar Prophet (mejor manejo de estacionalidad y eventos, §8):

```powershell
pip install prophet
```

En Windows, `prophet` suele traer wheels precompiladas para Python 3.11. Si la
instalación falla por `cmdstanpy`/Stan, el servicio detecta la ausencia de
Prophet y usa el fallback automáticamente — no hay que cambiar código.

El endpoint `/health` reporta `prophet_disponible: true|false`.

## Correr el servicio

```powershell
# El INTERNAL_TOKEN debe coincidir con el del backend (.env de la raíz).
$env:INTERNAL_TOKEN = "el-mismo-token-del-backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

O, desde la raíz del proyecto, junto con el backend:

```powershell
npm run dev      # levanta Node + Python con concurrently
```
