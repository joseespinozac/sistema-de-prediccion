FROM python:3.11-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Prophet is optional (commented in requirements.txt). The fallback engine
# only needs fastapi/uvicorn/pandas/numpy, so plain slim is enough.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py predictor.py ./

EXPOSE 8000

# uvicorn single worker is fine for an internal-only service.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
