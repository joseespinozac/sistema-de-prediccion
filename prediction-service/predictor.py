"""Lógica de predicción de series de tiempo.

Motor primario: **Prophet** (estacionalidad + eventos como holidays, §8).
Si Prophet no está instalado o falla al importar (típico en Windows por la
compilación de cmdstanpy/Stan), se usa un **fallback** ligero basado en
numpy/pandas: tendencia lineal + estacionalidad semanal promedio. El fallback
no pretende igualar a Prophet, pero mantiene el servicio funcional y verificable
(§8, nota de despliegue).

El backend Node no necesita saber cuál motor se usó; el contrato de salida es
idéntico. El campo `componentes.motor` indica cuál corrió, para trazabilidad.
"""
from __future__ import annotations

import math
from datetime import date, timedelta

import pandas as pd

# Intento de cargar Prophet. Si no está disponible, marcamos el fallback.
try:
    from prophet import Prophet  # type: ignore

    PROPHET_AVAILABLE = True
except Exception:  # ImportError o error de compilación de Stan
    PROPHET_AVAILABLE = False


def _build_holidays(eventos_externos):
    """Convierte eventos externos al DataFrame de holidays que espera Prophet."""
    if not eventos_externos:
        return None
    rows = []
    for ev in eventos_externos:
        rows.append(
            {
                "holiday": ev.get("tipo", "evento"),
                "ds": pd.to_datetime(ev["fecha"]),
                "lower_window": 0,
                # Ventana de influencia posterior al evento (días).
                "upper_window": 7,
            }
        )
    return pd.DataFrame(rows)


def _predict_prophet(df, eventos_externos, horizonte_dias, nivel_confianza):
    holidays = _build_holidays(eventos_externos)
    model = Prophet(
        interval_width=nivel_confianza,
        weekly_seasonality=True,
        yearly_seasonality=len(df) >= 365,
        daily_seasonality=False,
        holidays=holidays,
    )
    model.fit(df)
    future = model.make_future_dataframe(periods=horizonte_dias, freq="D")
    forecast = model.predict(future)

    # Solo el horizonte futuro (las filas nuevas).
    tail = forecast.tail(horizonte_dias)
    prediccion = [
        {
            "fecha": row.ds.strftime("%Y-%m-%d"),
            "yhat": round(float(row.yhat), 2),
            "yhat_lower": round(float(row.yhat_lower), 2),
            "yhat_upper": round(float(row.yhat_upper), 2),
        }
        for row in tail.itertuples()
    ]
    return prediccion, {"motor": "prophet"}


def _predict_fallback(df, horizonte_dias, nivel_confianza):
    """Fallback: regresión lineal sobre el índice + estacionalidad semanal.

    - Tendencia: mínimos cuadrados sobre el número de día.
    - Estacionalidad: desviación promedio de cada día de la semana respecto
      a la tendencia.
    - Banda de confianza: a partir del desvío estándar de los residuos,
      escalado por el z aproximado del nivel de confianza.
    """
    y = df["y"].to_numpy(dtype=float)
    n = len(y)
    x = list(range(n))

    # Ajuste lineal y = a*x + b (mínimos cuadrados).
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    denom = sum((xi - mean_x) ** 2 for xi in x) or 1.0
    a = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n)) / denom
    b = mean_y - a * mean_x

    # Estacionalidad semanal: promedio de residuos por día de la semana.
    ds = pd.to_datetime(df["ds"])
    residuals_by_dow = {i: [] for i in range(7)}
    residuals = []
    for i in range(n):
        trend = a * x[i] + b
        resid = y[i] - trend
        residuals.append(resid)
        residuals_by_dow[ds.iloc[i].dayofweek].append(resid)
    weekly = {
        dow: (sum(vals) / len(vals) if vals else 0.0)
        for dow, vals in residuals_by_dow.items()
    }

    # Desvío de los residuos ya descontada la estacionalidad.
    deseason = [
        residuals[i] - weekly[ds.iloc[i].dayofweek] for i in range(n)
    ]
    var = sum(r * r for r in deseason) / max(1, n - 1)
    std = math.sqrt(var)

    # z aproximado para el nivel de confianza (0.8→1.28, 0.9→1.64, 0.95→1.96).
    z = _z_for_confidence(nivel_confianza)
    margin = z * std

    last_date = ds.iloc[-1].date()
    prediccion = []
    for h in range(1, horizonte_dias + 1):
        d = last_date + timedelta(days=h)
        trend = a * (n - 1 + h) + b
        yhat = trend + weekly[d.weekday()]
        prediccion.append(
            {
                "fecha": d.strftime("%Y-%m-%d"),
                "yhat": round(max(0.0, yhat), 2),
                "yhat_lower": round(max(0.0, yhat - margin), 2),
                "yhat_upper": round(max(0.0, yhat + margin), 2),
            }
        )
    return prediccion, {"motor": "fallback_lineal_estacional"}


def _z_for_confidence(conf):
    table = {0.5: 0.674, 0.8: 1.282, 0.9: 1.645, 0.95: 1.960, 0.99: 2.576}
    # Toma el z de la clave más cercana.
    closest = min(table.keys(), key=lambda k: abs(k - conf))
    return table[closest]


def predict(series, eventos_externos, horizonte_dias, nivel_confianza):
    """Punto de entrada. `series` = [{"fecha","valor"}, ...] ordenada o no.

    Devuelve (prediccion, componentes).
    """
    df = pd.DataFrame(
        {
            "ds": pd.to_datetime([p["fecha"] for p in series]),
            "y": [float(p["valor"]) for p in series],
        }
    ).sort_values("ds").reset_index(drop=True)

    if PROPHET_AVAILABLE:
        try:
            return _predict_prophet(
                df, eventos_externos, horizonte_dias, nivel_confianza
            )
        except Exception:
            # Si Prophet falla en runtime, degradar al fallback.
            pass
    return _predict_fallback(df, horizonte_dias, nivel_confianza)
