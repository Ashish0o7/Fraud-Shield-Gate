"""Tests for the ML fraud detection model."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
import numpy as np
from model import FraudDetectionModel, haversine_km


@pytest.fixture(scope="module")
def trained_model():
    """Train model once for all tests in this module."""
    model = FraudDetectionModel()
    model.train()
    return model


class TestModelTraining:
    """Tests that the model trains correctly and produces valid outputs."""

    def test_model_trains_without_error(self, trained_model):
        assert trained_model.model is not None
        assert trained_model.scaler is not None

    def test_model_has_correct_estimators(self, trained_model):
        assert trained_model.model.n_estimators == 200

    def test_scaler_has_correct_feature_count(self, trained_model):
        assert trained_model.scaler.n_features_in_ == 7


class TestPredictions:
    """Tests that predictions are valid and directionally correct."""

    def test_prediction_returns_valid_score(self, trained_model):
        tx = {
            "userId": "user-1",
            "amount": 5000,
            "merchantCategory": "RETAIL",
            "location": "Mumbai",
            "timestamp": 1712345678000,
        }
        result = trained_model.predict(tx)

        assert "anomaly_score" in result
        assert "is_anomaly" in result
        assert "feature_contributions" in result
        assert 0.0 <= result["anomaly_score"] <= 1.0

    def test_high_amount_crypto_scores_higher(self, trained_model):
        """High-amount crypto transactions should score higher than normal retail."""
        normal_tx = {
            "amount": 1000,
            "merchantCategory": "RETAIL",
            "location": "Mumbai",
            "timestamp": 1712345678000,
            "txCountLast10Mins": 1,
            "trustScore": 80,
        }
        risky_tx = {
            "amount": 500000,
            "merchantCategory": "CRYPTO",
            "location": "Mumbai",
            "timestamp": 1712345678000,
            "txCountLast10Mins": 15,
            "trustScore": 20,
        }

        normal_score = trained_model.predict(normal_tx)["anomaly_score"]
        risky_score = trained_model.predict(risky_tx)["anomaly_score"]

        assert risky_score > normal_score, \
            f"Risky tx score ({risky_score}) should be > normal tx score ({normal_score})"

    def test_handles_missing_fields_gracefully(self, trained_model):
        """Model should not crash with minimal input."""
        result = trained_model.predict({"amount": 1000})
        assert result is not None
        assert 0.0 <= result["anomaly_score"] <= 1.0

    def test_feature_contributions_present(self, trained_model):
        result = trained_model.predict({
            "amount": 10000,
            "merchantCategory": "GAMING",
            "location": "Delhi",
        })
        contribs = result["feature_contributions"]
        assert "log_amount" in contribs
        assert "merchant_risk" in contribs
        assert "geo_distance_norm" in contribs


class TestFeatureEngineering:
    """Tests for individual feature extraction logic."""

    def test_extract_features_returns_7_features(self, trained_model):
        tx = {"amount": 5000, "merchantCategory": "RETAIL", "location": "Mumbai"}
        features = trained_model.extract_features(tx)
        assert len(features) == 7

    def test_log_amount_is_positive(self, trained_model):
        features = trained_model.extract_features({"amount": 100})
        assert features[0] > 0, "log_amount should be positive"

    def test_geo_distance_nonzero_for_different_cities(self, trained_model):
        tx = {"amount": 100, "location": "MUMBAI", "lastLocation": "DELHI"}
        features = trained_model.extract_features(tx)
        assert features[6] > 0, "geo_distance should be > 0 for different cities"

    def test_geo_distance_zero_for_same_city(self, trained_model):
        tx = {"amount": 100, "location": "MUMBAI", "lastLocation": "MUMBAI"}
        features = trained_model.extract_features(tx)
        assert features[6] == 0.0


class TestHaversine:
    """Tests for the Haversine distance calculation."""

    def test_mumbai_to_delhi(self):
        # Known: ~1,148 km
        dist = haversine_km(19.0760, 72.8777, 28.6139, 77.2090)
        assert 1090 < dist < 1200

    def test_same_point_is_zero(self):
        dist = haversine_km(19.0760, 72.8777, 19.0760, 72.8777)
        assert dist == pytest.approx(0.0, abs=0.001)
