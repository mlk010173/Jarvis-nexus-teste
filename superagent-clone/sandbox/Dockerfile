FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash coreutils git curl jq python3 python3-pip ripgrep ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY app.py /srv/app.py
RUN pip install --no-cache-dir fastapi uvicorn pydantic
EXPOSE 8001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--app-dir", "/srv"]
