"""Servicio interno de predicción (FastAPI).

Expone un único endpoint POST /predict. NO es público: exige el header
`X-Internal-Token` que debe coincidir con la variable de entorno INTERNAL_TOKEN
(idéntica a la del backend Node, §8).

Contrato de entrada/salida documentado en implementation-plan.md §8.
"""
from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from predictor import predict, PROPHET_AVAILABLE

INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")

app = FastAPI(title="Predictor de Tráfico E3 — servicio de predicción", version="0.1.0")


class Punto(BaseModel):
    fecha: str  # "YYYY-MM-DD"
    valor: float


class EventoExterno(BaseModel):
    fecha: str
    tipo: str
    descripcion: str | None = None


class PredictRequest(BaseModel):
    series: list[Punto] = Field(..., min_length=1)
    eventos_externos: list[EventoExterno] = Field(default_factory=list)
    horizonte_dias: int = 30
    nivel_confianza: float = 0.8


def _check_token(token: str | None):
    # Si INTERNAL_TOKEN no está configurado, se rechaza todo por seguridad
    # (mejor fallar cerrado que dejar el servicio abierto).
    if not INTERNAL_TOKEN:
        raise HTTPException(status_code=503, detail="INTERNAL_TOKEN no configurado en el servicio.")
    if token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Token interno inválido.")


@app.get("/health")
def health():
    return {"ok": True, "prophet_disponible": PROPHET_AVAILABLE}


@app.post("/predict")
def do_predict(
    body: PredictRequest,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
):
    _check_token(x_internal_token)

    if body.horizonte_dias < 1 or body.horizonte_dias > 365:
        raise HTTPException(status_code=400, detail="horizonte_dias debe estar entre 1 y 365.")

    series = [{"fecha": p.fecha, "valor": p.valor} for p in body.series]
    eventos = [
        {"fecha": e.fecha, "tipo": e.tipo, "descripcion": e.descripcion}
        for e in body.eventos_externos
    ]

    try:
        prediccion, componentes = predict(
            series=series,
            eventos_externos=eventos,
            horizonte_dias=body.horizonte_dias,
            nivel_confianza=body.nivel_confianza,
        )
    except Exception as exc:  # pragma: no cover - salvaguarda
        raise HTTPException(status_code=500, detail=f"Error al generar la predicción: {exc}")

    return {
        "estado": "ok",
        "prediccion": prediccion,
        "componentes": componentes,
    }
