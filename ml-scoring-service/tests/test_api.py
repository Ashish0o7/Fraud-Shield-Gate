"""Tests for the ML scoring Flask API."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
import json
from app import app


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestPredictEndpoint:

    def test_valid_prediction(self, client):
        response = client.post("/scores/predict", json={
            "userId": "user-42",
            "amount": 15000,
            "merchantCategory": "RETAIL",
            "location": "Mumbai",
            "timestamp": 1712345678000,
        })
        assert response.status_code == 200
        data = response.get_json()
        assert "anomaly_score" in data
        assert "is_anomaly" in data
        assert isinstance(data["anomaly_score"], float)
        assert isinstance(data["is_anomaly"], bool)

    def test_missing_body_returns_400(self, client):
        response = client.post("/scores/predict",
                               data="not json",
                               content_type="text/plain")
        assert response.status_code == 400

    def test_missing_amount_returns_400(self, client):
        response = client.post("/scores/predict", json={
            "userId": "user-1",
            "merchantCategory": "RETAIL",
        })
        assert response.status_code == 400

    def test_high_risk_transaction(self, client):
        response = client.post("/scores/predict", json={
            "amount": 500000,
            "merchantCategory": "CRYPTO",
            "location": "Mumbai",
            "txCountLast10Mins": 20,
            "trustScore": 10,
        })
        assert response.status_code == 200
        data = response.get_json()
        # High-risk transactions should have elevated scores
        assert data["anomaly_score"] > 0.3


class TestHealthEndpoint:

    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "healthy"
        assert data["features"] == 7

    def test_health_includes_model_info(self, client):
        response = client.get("/health")
        data = response.get_json()
        assert data["model"] == "IsolationForest"


class TestModelInfoEndpoint:

    def test_model_info(self, client):
        response = client.get("/model/info")
        assert response.status_code == 200
        data = response.get_json()
        assert data["algorithm"] == "IsolationForest"
        assert data["n_estimators"] == 200
        assert len(data["feature_names"]) == 7
