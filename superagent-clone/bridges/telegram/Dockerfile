FROM python:3.12-slim
RUN pip install --no-cache-dir fastapi uvicorn httpx
WORKDIR /srv
COPY app.py .
EXPOSE 8003
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8003"]
