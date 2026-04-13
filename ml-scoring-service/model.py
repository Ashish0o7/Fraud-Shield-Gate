"""
Fraud Detection Model — Isolation Forest with feature engineering.

Trains on synthetic financial transaction data and exposes a predict()
method that returns an anomaly score between 0.0 and 1.0.

Key design decisions:
 - Isolation Forest chosen because it works well with high-dimensional data
   and doesn't require labeled fraud examples (unsupervised).
 - Features are engineered to capture velocity, geo-risk, and temporal
   patterns — the same signals real fraud systems use.
 - StandardScaler ensures features with different ranges don't dominate
   the tree splits.
"""

import numpy as np
import joblib
import os
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

MODEL_PATH = os.path.join(os.path.dirname(__file__), "trained_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "trained_scaler.pkl")

# Merchant risk encoding — higher = riskier category
MERCHANT_RISK = {
    "RETAIL": 0.1,
    "TRAVEL": 0.3,
    "GAMING": 0.7,
    "CRYPTO": 0.9,
}

# City coordinates for geo-distance feature
CITY_COORDS = {
    "MUMBAI": (19.0760, 72.8777),
    "DELHI": (28.6139, 77.2090),
    "BANGALORE": (12.9716, 77.5946),
    "CHENNAI": (13.0827, 80.2707),
    "KOLKATA": (22.5726, 88.3639),
    "HYDERABAD": (17.3850, 78.4867),
    "PUNE": (18.5204, 73.8567),
    "AHMEDABAD": (23.0225, 72.5714),
    "JAIPUR": (26.9124, 75.7873),
    "LUCKNOW": (26.8467, 80.9462),
}

CITIES = list(CITY_COORDS.keys())
MERCHANTS = list(MERCHANT_RISK.keys())


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance between two points on Earth in kilometers."""
    R = 6371.0
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (np.sin(dlat / 2) ** 2 +
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) *
         np.sin(dlon / 2) ** 2)
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))


class FraudDetectionModel:
    """
    Wraps an Isolation Forest model with feature engineering pipeline.

    Features extracted per transaction:
      0. log_amount         — log-transformed amount (reduces skew)
      1. merchant_risk      — encoded category risk level
      2. hour_sin           — cyclical hour of day (sin component)
      3. hour_cos           — cyclical hour of day (cos component)
      4. tx_velocity        — transaction count in last 10 minutes
      5. trust_score_norm   — normalized trust score [0, 1]
      6. geo_distance_norm  — distance from last location (normalized)
    """

    FEATURE_NAMES = [
        "log_amount", "merchant_risk", "hour_sin", "hour_cos",
        "tx_velocity", "trust_score_norm", "geo_distance_norm"
    ]

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()

    def extract_features(self, transaction: dict) -> np.ndarray:
        """
        Converts raw transaction JSON into a feature vector.
        Handles missing fields gracefully with sensible defaults.
        """
        amount = float(transaction.get("amount", 0))
        merchant = str(transaction.get("merchantCategory", "RETAIL")).upper()
        timestamp = int(transaction.get("timestamp", 0))
        tx_count = int(transaction.get("txCountLast10Mins", 0))
        trust_score = int(transaction.get("trustScore", 80))
        location = str(transaction.get("location", "")).upper().strip()
        last_location = str(transaction.get("lastLocation", "")).upper().strip()

        # Feature 0: Log-transformed amount (avoids large value domination)
        log_amount = np.log1p(amount)

        # Feature 1: Merchant category risk encoding
        merchant_risk = MERCHANT_RISK.get(merchant, 0.3)

        # Features 2-3: Cyclical time encoding (captures "unusual hour" signals)
        hour = (timestamp / 1000 / 3600) % 24 if timestamp > 0 else 12
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)

        # Feature 4: Transaction velocity (higher = more suspicious)
        tx_velocity = min(tx_count, 20)  # cap to avoid outlier distortion

        # Feature 5: Trust score normalized to [0, 1]
        trust_score_norm = trust_score / 100.0

        # Feature 6: Geographic distance from last known location
        geo_distance = 0.0
        if location and last_location and location != last_location:
            coords1 = CITY_COORDS.get(location)
            coords2 = CITY_COORDS.get(last_location)
            if coords1 and coords2:
                geo_distance = haversine_km(
                    coords1[0], coords1[1], coords2[0], coords2[1]
                )
        geo_distance_norm = min(geo_distance / 3000.0, 1.0)  # max ~3000km India

        return np.array([
            log_amount, merchant_risk, hour_sin, hour_cos,
            tx_velocity, trust_score_norm, geo_distance_norm
        ])

    def _generate_training_data(self, n_samples=10000) -> np.ndarray:
        """
        Generates synthetic training data representing normal transaction patterns.
        The Isolation Forest learns "normal" from this — deviations become anomalies.
        """
        rng = np.random.RandomState(42)
        features = []

        for _ in range(n_samples):
            # Normal amounts: lognormal with mean ~₹5000
            amount = rng.lognormal(mean=8.5, sigma=1.0)
            log_amount = np.log1p(amount)

            # Most transactions are RETAIL (low risk)
            merchant_weights = [0.5, 0.25, 0.15, 0.10]
            merchant = rng.choice(MERCHANTS, p=merchant_weights)
            merchant_risk = MERCHANT_RISK[merchant]

            # Normal hours: peak during 9am-9pm
            hour = rng.normal(loc=14, scale=4) % 24
            hour_sin = np.sin(2 * np.pi * hour / 24)
            hour_cos = np.cos(2 * np.pi * hour / 24)

            # Normal velocity: 0-3 transactions per 10 mins
            tx_velocity = rng.poisson(lam=1.5)
            tx_velocity = min(tx_velocity, 20)

            # Trust scores: normally distributed around 75
            trust_score = rng.normal(loc=75, scale=10)
            trust_score = np.clip(trust_score, 0, 100)
            trust_score_norm = trust_score / 100.0

            # Geo distance: mostly local (0), occasionally intercity
            if rng.random() < 0.8:
                geo_distance_norm = 0.0
            else:
                geo_distance_norm = rng.uniform(0.0, 0.3)

            features.append([
                log_amount, merchant_risk, hour_sin, hour_cos,
                tx_velocity, trust_score_norm, geo_distance_norm
            ])

        return np.array(features)

    def train(self):
        """
        Trains the Isolation Forest on synthetic normal transaction data.
        contamination=0.05 tells the model ~5% of data might be anomalous.
        """
        data = self._generate_training_data(10000)
        self.scaler.fit(data)
        scaled = self.scaler.transform(data)

        self.model = IsolationForest(
            n_estimators=200,
            contamination=0.05,
            max_samples="auto",
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(scaled)

    def predict(self, transaction: dict) -> dict:
        """
        Scores a single transaction for anomaly.

        Returns:
            {
                "anomaly_score": float,  # 0.0 (normal) to 1.0 (highly anomalous)
                "is_anomaly": bool,
                "feature_contributions": dict,  # which features drove the score
            }
        """
        features = self.extract_features(transaction)
        scaled = self.scaler.transform(features.reshape(1, -1))

        # decision_function: positive = inlier, negative = outlier
        raw_score = self.model.decision_function(scaled)[0]
        prediction = self.model.predict(scaled)[0]  # 1 = inlier, -1 = outlier

        # Map raw score to 0-1 range: more negative → closer to 1.0 (anomalous)
        # Typical raw scores range from -0.5 (very anomalous) to +0.3 (very normal)
        anomaly_score = max(0.0, min(1.0, 0.5 - raw_score))

        # Build feature contribution map for explainability
        contributions = {}
        for i, name in enumerate(self.FEATURE_NAMES):
            contributions[name] = round(float(features[i]), 4)

        return {
            "anomaly_score": round(float(anomaly_score), 4),
            "is_anomaly": bool(prediction == -1),
            "feature_contributions": contributions,
        }

    def save(self):
        """Persist trained model and scaler to disk."""
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)

    def load(self) -> bool:
        """Load pre-trained model from disk. Returns False if not found."""
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            self.model = joblib.load(MODEL_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            return True
        return False


# ── Module-level singleton ──────────────────────────────────────────────
_model = FraudDetectionModel()


def get_model() -> FraudDetectionModel:
    """Returns the singleton model instance, training if necessary."""
    if _model.model is None:
        if not _model.load():
            _model.train()
            _model.save()
    return _model
