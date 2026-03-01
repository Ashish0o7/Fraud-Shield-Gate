"""
ML Anomaly Detection Model for ShieldGate Fraud Detection.

Uses scikit-learn's Isolation Forest to detect anomalous transaction patterns.
The model is pre-trained on synthetic data that represents the feature space
of normal vs. fraudulent transactions.

Features used:
  - amount (normalized)
  - tx_count_velocity (transactions in 10-min window)
  - merchant_risk (0=RETAIL/TRAVEL, 1=GAMING, 2=CRYPTO)
  - trust_score (0-100, normalized)
  - hour_of_day (0-23, cyclical encoding)
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import logging

logger = logging.getLogger(__name__)

MERCHANT_RISK_MAP = {
    "RETAIL": 0,
    "TRAVEL": 0,
    "GAMING": 1,
    "CRYPTO": 2,
}


class AnomalyModel:
    """Isolation Forest-based anomaly detection model."""

    def __init__(self, contamination: float = 0.1, n_estimators: int = 200, random_state: int = 42):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
            n_jobs=-1,
        )
        self.scaler = StandardScaler()
        self.is_trained = False

    def _generate_training_data(self, n_samples: int = 10000) -> np.ndarray:
        """
        Generate synthetic training data that models the normal transaction space.
        The Isolation Forest will learn what 'normal' looks like, and flag outliers.
        """
        rng = np.random.RandomState(42)

        # Normal transactions: moderate amounts, low velocity, safe merchants, decent trust
        normal_amount = rng.exponential(scale=30000, size=n_samples) + 100
        normal_velocity = rng.poisson(lam=1.5, size=n_samples)
        normal_merchant = rng.choice([0, 0, 0, 0, 1, 2], size=n_samples)  # mostly RETAIL
        normal_trust = rng.normal(loc=75, scale=10, size=n_samples).clip(0, 100)
        normal_hour = rng.choice(range(8, 22), size=n_samples)  # business hours

        # Inject ~5% anomalous patterns to help the model
        n_anomalies = int(n_samples * 0.05)

        # Anomaly type 1: Extremely high amounts + low trust
        anom_amount = rng.uniform(150000, 500000, size=n_anomalies)
        anom_velocity = rng.poisson(lam=6, size=n_anomalies)
        anom_merchant = rng.choice([1, 2, 2], size=n_anomalies)  # high-risk merchants
        anom_trust = rng.uniform(10, 40, size=n_anomalies)
        anom_hour = rng.choice([0, 1, 2, 3, 4, 5, 23], size=n_anomalies)  # odd hours

        amount = np.concatenate([normal_amount, anom_amount])
        velocity = np.concatenate([normal_velocity, anom_velocity])
        merchant = np.concatenate([normal_merchant, anom_merchant])
        trust = np.concatenate([normal_trust, anom_trust])
        hour = np.concatenate([normal_hour, anom_hour])

        # Cyclical hour encoding
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)

        data = np.column_stack([amount, velocity, merchant, trust, hour_sin, hour_cos])
        return data

    def train(self):
        """Train the Isolation Forest on synthetic data."""
        logger.info("Generating synthetic training data...")
        data = self._generate_training_data()

        logger.info("Fitting StandardScaler...")
        scaled_data = self.scaler.fit_transform(data)

        logger.info("Training Isolation Forest model (n_estimators=200)...")
        self.model.fit(scaled_data)
        self.is_trained = True
        logger.info("Model training complete. Ready for predictions.")

    def extract_features(self, transaction: dict) -> np.ndarray:
        """Extract feature vector from a transaction event dict."""
        amount = float(transaction.get("amount") or 0.0)
        # Velocity is not directly in the event; estimate from context
        # We'll use riskScore as a proxy for velocity-related signals
        risk_score = int(transaction.get("riskScore") or 0)

        merchant_category = transaction.get("merchantCategory") or "RETAIL"
        merchant_risk = MERCHANT_RISK_MAP.get(merchant_category, 0)

        # Trust is not in the event directly — use inverse of risk as approximation
        trust_proxy = max(0, 100 - risk_score * 1.5)

        # Extract hour from timestamp
        timestamp_ms = int(transaction.get("timestamp", 0))
        if timestamp_ms > 0:
            import datetime
            dt = datetime.datetime.fromtimestamp(timestamp_ms / 1000)
            hour = dt.hour
        else:
            hour = 12  # default to noon

        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)

        features = np.array([[amount, risk_score, merchant_risk, trust_proxy, hour_sin, hour_cos]])
        return features

    def predict(self, transaction: dict) -> dict:
        """
        Score a transaction for anomaly.

        Returns:
            dict with:
              - anomaly_score: float between 0-1 (1 = most anomalous)
              - is_anomaly: bool
              - raw_score: float (Isolation Forest decision function value)
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained. Call train() first.")

        features = self.extract_features(transaction)
        scaled = self.scaler.transform(features)

        # decision_function: negative = anomaly, positive = normal
        raw_score = self.model.decision_function(scaled)[0]

        # Convert to 0-1 scale where 1 = most anomalous
        # Raw scores typically range from about -0.5 to 0.5
        anomaly_score = max(0.0, min(1.0, 0.5 - raw_score))

        # Prediction: -1 = anomaly, 1 = normal
        prediction = self.model.predict(scaled)[0]
        is_anomaly = bool(prediction == -1)

        return {
            "anomaly_score": round(float(anomaly_score), 4),
            "is_anomaly": is_anomaly,
            "raw_score": round(float(raw_score), 4),
        }
