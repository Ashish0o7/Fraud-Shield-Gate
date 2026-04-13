FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Train model at build time so container starts fast
RUN python -c "from model import get_model; get_model()"

EXPOSE 8000

CMD ["python", "app.py"]
