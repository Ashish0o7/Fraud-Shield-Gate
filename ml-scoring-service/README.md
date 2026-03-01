# ShieldGate ML Scoring Service

AI-powered anomaly detection microservice for the ShieldGate fraud detection pipeline.

## Architecture

- **Consumes** evaluated transactions from RabbitMQ (`ml.scoring.queue` bound to `tx.fanout`)
- **Scores** each transaction using a pre-trained **Isolation Forest** model (scikit-learn)
- **Persists** anomaly scores to Elasticsearch (`ml-anomaly-scores` index)
- **Exposes** REST API for querying scores

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start the service
uvicorn main:app --host 0.0.0.0 --port 8000

# (Requires RabbitMQ on localhost:5672 and Elasticsearch on localhost:9200)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health + model status |
| `GET` | `/scores/latest` | Last 20 anomaly scores |
| `GET` | `/scores/{txId}` | Score for specific transaction |
| `POST` | `/scores/predict` | Manually score a transaction JSON |

## How the Model Works

1. **Training**: At startup, the Isolation Forest trains on synthetic data modeling normal transaction patterns
2. **Features**: amount, velocity proxy, merchant risk level, trust proxy, hour-of-day (cyclical)
3. **Scoring**: Each transaction gets a `0-1` anomaly score where `1 = most anomalous`
4. **Output**: Scored documents written to ES with `transactionId`, `anomalyScore`, `isAnomaly`, and transaction context
