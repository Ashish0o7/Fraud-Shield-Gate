package com.shieldgate.core;

import com.shieldgate.api.EvaluatedEvent;
import com.shieldgate.api.Transaction;
import com.shieldgate.api.UserState;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.math.BigDecimal;

public class FraudRulesEngine {

    private final HttpClient httpClient;
    private final ObjectMapper mapper;
    private final String mlServiceUrl = "http://localhost:8000/scores/predict";

    public FraudRulesEngine() {
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        this.mapper = new ObjectMapper();
    }

    public EvaluatedEvent evaluate(Transaction tx, UserState state) {
        try {
            // Build the payload expected by the ML service
            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", tx.getUserId());
            payload.put("amount", tx.getAmount());
            payload.put("merchantCategory", tx.getMerchantCategory());
            payload.put("location", tx.getLocation());
            payload.put("timestamp", tx.getTimestamp());
            if (state != null) {
                payload.put("txCountLast10Mins", state.getTxCountLast10Mins());
                payload.put("trustScore", state.getTrustScore());
                payload.put("lastLocation", state.getLastLocation());
                payload.put("lastTxTimestamp", state.getLastTxTimestamp());
            }

            String jsonPayload = mapper.writeValueAsString(payload);
            System.out.println("----- JSON SENDING TO PYTHON -----");
            System.out.println(jsonPayload);
            System.out.println("----------------------------------");
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(mlServiceUrl))
                    .timeout(Duration.ofSeconds(2))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                @SuppressWarnings("unchecked")
                Map<String, Object> mlResult = mapper.readValue(response.body(), Map.class);

                boolean isAnomaly = (Boolean) mlResult.get("is_anomaly");
                double anomalyScore = ((Number) mlResult.get("anomaly_score")).doubleValue();

                // Map the ML score to a 0-100 risk score
                int riskScore = (int) (anomalyScore * 100);

                String status;
                if (isAnomaly) {
                    status = "BLOCKED";
                } else if (riskScore > 55) {
                    status = "FLAGGED";
                } else {
                    status = "APPROVED";
                }

                String riskReason = isAnomaly ? "AI Anomaly Detected (Score: " + riskScore + ")" : null;
                EvaluatedEvent event = new EvaluatedEvent(tx, status, riskReason, riskScore);

                // Populate the new fields directly
                event.setAnomalyScore(anomalyScore);
                event.setIsAnomaly(isAnomaly);
                return event;
            } else {
                return fallbackEvaluation(tx, state, "ML Service returned " + response.statusCode());
            }

        } catch (Exception e) {
            return fallbackEvaluation(tx, state, "ML Service unreachable: " + e.getMessage());
        }
    }

    private EvaluatedEvent fallbackEvaluation(Transaction tx, UserState state, String reason) {
        int riskScore = 0;
        String status = "APPROVED";
        if (tx.getAmount().compareTo(new BigDecimal("100000")) > 0) {
            riskScore = 80;
            status = "BLOCKED";
        }
        return new EvaluatedEvent(tx, status, "Fallback Mode: " + reason, riskScore);
    }
}
