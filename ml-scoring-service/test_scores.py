from model import AnomalyModel
import numpy as np

model = AnomalyModel()
print("Training model...", flush=True)
model.train()

print("Generating test anomalies...", flush=True)
rng = np.random.RandomState(42)

data = model._generate_training_data(1000)
scaled = model.scaler.transform(data)

raw_scores = model.model.decision_function(scaled)
print(f"Min raw score: {np.min(raw_scores)}")
print(f"Max raw score: {np.max(raw_scores)}")
print(f"Mean raw score: {np.mean(raw_scores)}")

print(f"1st percentile (most anomalous): {np.percentile(raw_scores, 1)}")
print(f"5th percentile (anomalous threshold): {np.percentile(raw_scores, 5)}")
print(f"50th percentile: {np.percentile(raw_scores, 50)}")
print(f"99th percentile (most normal): {np.percentile(raw_scores, 99)}")
