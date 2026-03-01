"""
ShieldGate ML Scoring Service — FastAPI Application.

Consumes evaluated transaction events from RabbitMQ (ml.scoring.queue),
runs them through an Isolation Forest anomaly detection model, and
writes AI anomaly scores to Elasticsearch (ml-anomaly-scores index).

Endpoints:
  GET  /health              → Service health check
  GET  /scores/latest       → Latest 20 ML anomaly scores
  GET  /scores/{tx_id}      → Score for a specific transaction
"""

import json
import threading
import logging
import time
from datetime import datetime
from contextlib import asynccontextmanager

import pika
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from elasticsearch import Elasticsearch

from model import AnomalyModel

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("ml-scoring-service")

# ── Configuration ──
RABBITMQ_HOST = "localhost"
RABBITMQ_PORT = 5672
EXCHANGE_NAME = "tx.fanout"
QUEUE_NAME = "ml.scoring.queue"

ES_HOST = "localhost"
ES_PORT = 9200
ES_INDEX = "ml-anomaly-scores"

# ── Global state ──
model = AnomalyModel(contamination=0.1, n_estimators=200)
es_client: Elasticsearch | None = None
consumer_thread: threading.Thread | None = None
consumer_running = False
scores_processed = 0


def connect_elasticsearch() -> Elasticsearch:
    """Create Elasticsearch client with retry logic."""
    for attempt in range(5):
        try:
            client = Elasticsearch(f"http://{ES_HOST}:{ES_PORT}")
            if client.ping():
                logger.info("Connected to Elasticsearch at %s:%s", ES_HOST, ES_PORT)
                return client
        except Exception as e:
            logger.warning("ES connection attempt %d failed: %s", attempt + 1, e)
            time.sleep(2)
    raise ConnectionError("Could not connect to Elasticsearch after 5 attempts")


def index_score(tx_id: str, score_data: dict):
    """Write anomaly score to Elasticsearch."""
    global es_client
    try:
        doc = {
            "transactionId": tx_id,
            "anomalyScore": score_data["anomaly_score"],
            "isAnomaly": score_data["is_anomaly"],
            "rawScore": score_data["raw_score"],
            "scoredAt": datetime.utcnow().isoformat(),
            **score_data.get("transaction_summary", {}),
        }
        es_client.index(index=ES_INDEX, id=tx_id, document=doc)
    except Exception as e:
        logger.error("Failed to index score for tx %s: %s", tx_id, e)


def process_message(ch, method, properties, body):
    """RabbitMQ message callback — score transaction and index result."""
    global scores_processed
    try:
        event = json.loads(body)
        tx_id = event.get("transactionId", "unknown")

        # Run through ML model
        prediction = model.predict(event)

        # Add transaction context to the score doc
        prediction["transaction_summary"] = {
            "userId": event.get("userId"),
            "amount": event.get("amount"),
            "merchantCategory": event.get("merchantCategory"),
            "location": event.get("location"),
            "status": event.get("status"),
            "riskScore": event.get("riskScore"),
        }

        # Index to Elasticsearch
        index_score(tx_id, prediction)

        scores_processed += 1
        if scores_processed % 50 == 0:
            logger.info("Scored %d transactions so far", scores_processed)

        log_level = logging.WARNING if prediction["is_anomaly"] else logging.DEBUG
        logger.log(
            log_level,
            "Scored tx=%s → anomaly=%.4f, is_anomaly=%s",
            tx_id,
            prediction["anomaly_score"],
            prediction["is_anomaly"],
        )

    except Exception as e:
        logger.error("Error processing message: %s", e)


def start_consumer():
    """Start RabbitMQ consumer in a background thread."""
    global consumer_running

    def _consume():
        global consumer_running
        while consumer_running:
            try:
                connection = pika.BlockingConnection(
                    pika.ConnectionParameters(host=RABBITMQ_HOST, port=RABBITMQ_PORT)
                )
                channel = connection.channel()

                # Declare exchange and queue, then bind
                channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="fanout", durable=True)
                channel.queue_declare(queue=QUEUE_NAME, durable=True)
                channel.queue_bind(queue=QUEUE_NAME, exchange=EXCHANGE_NAME)

                logger.info("RabbitMQ consumer started — listening on %s", QUEUE_NAME)

                channel.basic_consume(queue=QUEUE_NAME, on_message_callback=process_message, auto_ack=True)
                channel.start_consuming()

            except pika.exceptions.AMQPConnectionError:
                if consumer_running:
                    logger.warning("RabbitMQ connection lost. Reconnecting in 5s...")
                    time.sleep(5)
            except Exception as e:
                if consumer_running:
                    logger.error("Consumer error: %s. Restarting in 5s...", e)
                    time.sleep(5)

    consumer_running = True
    thread = threading.Thread(target=_consume, daemon=True, name="rabbitmq-consumer")
    thread.start()
    return thread


# ── FastAPI Lifespan ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: train model, connect ES, start consumer. Shutdown: stop consumer."""
    global es_client, consumer_thread, consumer_running

    # Train model
    model.train()

    # Connect to Elasticsearch
    try:
        es_client = connect_elasticsearch()
    except ConnectionError as e:
        logger.error("Elasticsearch unavailable: %s", e)
        logger.warning("Service will start without ES — scores won't be persisted")

    # Start RabbitMQ consumer
    try:
        consumer_thread = start_consumer()
    except Exception as e:
        logger.error("Failed to start RabbitMQ consumer: %s", e)
        logger.warning("Service will start without consumer — use API for manual scoring")

    logger.info("ML Scoring Service ready")
    yield

    # Shutdown
    consumer_running = False
    logger.info("ML Scoring Service shutting down")


# ── FastAPI App ──

app = FastAPI(
    title="ShieldGate ML Scoring Service",
    description="AI-powered anomaly detection for financial transactions",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    es_healthy = False
    try:
        es_healthy = es_client is not None and es_client.ping()
    except Exception:
        pass

    return {
        "status": "healthy",
        "model_trained": model.is_trained,
        "elasticsearch": "connected" if es_healthy else "disconnected",
        "consumer": "running" if consumer_running else "stopped",
        "scores_processed": scores_processed,
    }


@app.get("/scores/latest")
async def get_latest_scores():
    """Get the latest 20 ML anomaly scores."""
    if es_client is None:
        raise HTTPException(status_code=503, detail="Elasticsearch not connected")

    try:
        result = es_client.search(
            index=ES_INDEX,
            body={
                "size": 20,
                "sort": [{"scoredAt": {"order": "desc"}}],
                "query": {"match_all": {}},
            },
        )
        scores = [hit["_source"] for hit in result["hits"]["hits"]]
        return {"scores": scores, "total": result["hits"]["total"]["value"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.get("/scores/{transaction_id}")
async def get_score(transaction_id: str):
    """Get ML anomaly score for a specific transaction."""
    if es_client is None:
        raise HTTPException(status_code=503, detail="Elasticsearch not connected")

    try:
        result = es_client.get(index=ES_INDEX, id=transaction_id)
        return result["_source"]
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Score not found for tx {transaction_id}")


@app.post("/scores/predict")
async def predict_score(request: Request):
    """Manually score a transaction via the API (useful for testing)."""
    if not model.is_trained:
        raise HTTPException(status_code=503, detail="Model not yet trained")

    try:
        transaction = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    prediction = model.predict(transaction)
    return prediction
