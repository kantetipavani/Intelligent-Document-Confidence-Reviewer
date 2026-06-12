# syntax=docker/dockerfile:1

FROM python:3.12-slim AS builder

WORKDIR /app

# System deps (keep minimal)
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential \
  && rm -rf /var/lib/apt/lists/*

# Install Python deps into a wheelhouse
COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip \
  && python -m pip wheel --wheel-dir /wheels -r requirements.txt


FROM python:3.12-slim AS runtime

WORKDIR /app

# Create non-root user
RUN useradd -m -u 10001 appuser

# Copy wheels and install
COPY --from=builder /wheels /wheels
RUN python -m pip install --no-index --find-links=/wheels /wheels/* \
  && rm -rf /wheels

# Copy application source
COPY app ./app
COPY README.md ./README.md

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request as r; print(r.urlopen('http://127.0.0.1:8000/health').status)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

