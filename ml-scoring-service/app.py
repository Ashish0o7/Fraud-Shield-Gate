"""
ML Scoring Service — Flask REST API for real-time fraud detection.

Endpoints:
  POST /scores/predict  — Score a transaction for fraud anomaly
  GET  /health          — Liveness/readiness probe
  GET  /model/info      — Model metadata (feature names, training info)
"""

import time
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from model import get_model

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("ml-scoring")

# ── Warm up model at import time ─────────────────────────────────────────
_startup_start = time.time()
_model = get_model()
log.info("Model ready in %.2fs", time.time() - _startup_start)


@app.route("/scores/predict", methods=["POST"])
def predict():
    """
    Score a transaction for fraud.

    Request Body (JSON):
      {
        "userId": "user-42",
        "amount": 150000,
        "merchantCategory": "CRYPTO",
        "location": "Mumbai",
        "timestamp": 1712345678000,
        "txCountLast10Mins": 5,
        "trustScore": 40,
        "lastLocation": "Delhi"
      }

    Response (JSON):
      {
        "anomaly_score": 0.82,
        "is_anomaly": true,
        "feature_contributions": { ... }
      }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    if "amount" not in data:
        return jsonify({"error": "Missing required field: amount"}), 400

    start = time.time()
    result = _model.predict(data)
    elapsed_ms = (time.time() - start) * 1000

    log.info(
        "Scored txn user=%s amount=%s → score=%.4f anomaly=%s (%.1fms)",
        data.get("userId", "?"),
        data.get("amount", "?"),
        result["anomaly_score"],
        result["is_anomaly"],
        elapsed_ms,
    )

    return jsonify(result), 200


@app.route("/health", methods=["GET"])
def health():
    """Liveness probe — returns 200 if model is loaded and ready."""
    model = get_model()
    if model.model is None:
        return jsonify({"status": "unhealthy", "reason": "model not loaded"}), 503
    return jsonify({
        "status": "healthy",
        "model": "IsolationForest",
        "features": len(model.FEATURE_NAMES),
    }), 200


@app.route("/model/info", methods=["GET"])
def model_info():
    """Returns model metadata for observability dashboards."""
    model = get_model()
    return jsonify({
        "algorithm": "IsolationForest",
        "n_estimators": model.model.n_estimators if model.model else 0,
        "contamination": 0.05,
        "feature_names": model.FEATURE_NAMES,
        "training_samples": 10000,
    }), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
