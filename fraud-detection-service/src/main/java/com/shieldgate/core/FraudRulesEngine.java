package com.shieldgate.core;

import com.shieldgate.api.EvaluatedEvent;
import com.shieldgate.api.Transaction;
import com.shieldgate.api.UserState;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.math.BigDecimal;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Fraud evaluation engine with ML-backed anomaly detection.
 *
 * Production patterns implemented:
 * 1. Circuit Breaker — prevents cascading failures when ML service is down.
 * After N consecutive failures the breaker opens; requests fail fast to the
 * rule-based fallback instead of waiting for a timeout on every call.
 * 2. Configurable ML URL — injected from config, not hardcoded.
 * 3. Structured logging — SLF4J with contextual fields, no System.out.
 * 4. Graceful degradation — if ML is unreachable, falls back to deterministic
 * rule-based scoring so transactions are never dropped.
 */
public class FraudRulesEngine {
    private static final Logger log = LoggerFactory.getLogger(FraudRulesEngine.class);

    private final HttpClient httpClient;
    private final ObjectMapper mapper;
    private final String mlServiceUrl;
    private final CircuitBreaker circuitBreaker;
    private final int mlTimeoutMillis;
    private final Semaphore bulkhead;

    /**
     * @param mlServiceUrl base URL for the ML scoring service, e.g.
     *                     "http://localhost:8000"
     */
    public FraudRulesEngine(String mlServiceUrl) {
        this(mlServiceUrl, 120, 50);
    }

    public FraudRulesEngine(String mlServiceUrl, int mlTimeoutMillis, int mlBulkheadMaxConcurrent) {
        this.mlServiceUrl = mlServiceUrl + "/scores/predict";
        this.mlTimeoutMillis = mlTimeoutMillis;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofMillis(Math.max(50, mlTimeoutMillis)))
                .build();
        this.mapper = new ObjectMapper();
        this.bulkhead = new Semaphore(Math.max(1, mlBulkheadMaxConcurrent));
        // Trip after 5 consecutive failures, recover probe after 30s
        this.circuitBreaker = new CircuitBreaker("ml-service", 5, Duration.ofSeconds(30));
    }

    public EvaluatedEvent evaluate(Transaction tx, UserState state) {
        // ── Circuit Breaker guard ──
        if (!circuitBreaker.allowRequest()) {
            log.warn("Circuit breaker OPEN — skipping ML call for txId={}", tx.getTransactionId());
            return fallbackEvaluation(tx, state, "Circuit breaker open — ML service unavailable");
        }

        boolean acquired = false;
        try {
            acquired = bulkhead.tryAcquire(5, TimeUnit.MILLISECONDS);
            if (!acquired) {
                log.warn("ML bulkhead saturated — using fallback for txId={}", tx.getTransactionId());
                return fallbackEvaluation(tx, state, "ML bulkhead saturated");
            }

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
            log.debug("ML request payload: {}", jsonPayload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(mlServiceUrl))
                    .timeout(Duration.ofMillis(Math.max(50, mlTimeoutMillis)))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                circuitBreaker.recordSuccess();

                @SuppressWarnings("unchecked")
                Map<String, Object> mlResult = mapper.readValue(response.body(), Map.class);

                boolean isAnomaly = (Boolean) mlResult.get("is_anomaly");
                double anomalyScore = ((Number) mlResult.get("anomaly_score")).doubleValue();

                // Map the ML score to a 0-100 risk score
                int riskScore = (int) (anomalyScore * 100);

                String status;
                if (isAnomaly && riskScore >= 80) {
                    status = "BLOCKED";
                } else if (isAnomaly || riskScore >= 65) {
                    status = "FLAGGED";
                } else {
                    status = "APPROVED";
                }

                String riskReason = isAnomaly ? "AI Anomaly Detected (Score: " + riskScore + ")" : null;
                EvaluatedEvent event = new EvaluatedEvent(tx, status, riskReason, riskScore);

                // Populate the ML-specific fields
                event.setAnomalyScore(anomalyScore);
                event.setIsAnomaly(isAnomaly);

                log.info("ML scored txId={} → status={} score={} anomaly={}",
                        tx.getTransactionId(), status, riskScore, isAnomaly);
                return event;
            } else {
                circuitBreaker.recordFailure();
                log.warn("ML service returned HTTP {} for txId={}", response.statusCode(), tx.getTransactionId());
                return fallbackEvaluation(tx, state, "ML Service returned " + response.statusCode());
            }

        } catch (Exception e) {
            circuitBreaker.recordFailure();
            log.error("ML service call failed for txId={}: {}", tx.getTransactionId(), e.getMessage());
            return fallbackEvaluation(tx, state, "ML Service unreachable: " + e.getMessage());
        } finally {
            if (acquired) {
                bulkhead.release();
            }
        }
    }

    /**
     * Deterministic rule-based fallback when ML service is unavailable.
     * Ensures transactions are never dropped — they get a conservative score
     * instead.
     */
    private EvaluatedEvent fallbackEvaluation(Transaction tx, UserState state, String reason) {
        int riskScore = 0;
        List<String> reasons = new ArrayList<>();

        BigDecimal amount = tx.getAmount() == null ? BigDecimal.ZERO : tx.getAmount();
        if (amount.compareTo(new BigDecimal("150000")) >= 0) {
            riskScore += 65;
            reasons.add("high_amount");
        } else if (amount.compareTo(new BigDecimal("100000")) >= 0) {
            riskScore += 45;
            reasons.add("elevated_amount");
        } else if (amount.compareTo(new BigDecimal("50000")) >= 0) {
            riskScore += 20;
            reasons.add("moderate_amount");
        }

        String merchant = tx.getMerchantCategory() == null ? "" : tx.getMerchantCategory().toUpperCase();
        if ("CRYPTO".equals(merchant) || "GAMING".equals(merchant)) {
            riskScore += 20;
            reasons.add("high_risk_merchant");
        }

        if (state != null) {
            if (state.getTxCountLast10Mins() >= 8) {
                riskScore += 25;
                reasons.add("velocity_spike");
            } else if (state.getTxCountLast10Mins() >= 5) {
                riskScore += 12;
                reasons.add("velocity_elevated");
            }

            if (state.getTrustScore() <= 40) {
                riskScore += 20;
                reasons.add("low_trust");
            } else if (state.getTrustScore() <= 60) {
                riskScore += 10;
                reasons.add("medium_trust");
            }

            String currentLocation = tx.getLocation() == null ? "" : tx.getLocation();
            String previousLocation = state.getLastLocation() == null ? "" : state.getLastLocation();
            if (!currentLocation.isBlank() && !previousLocation.isBlank()
                    && !currentLocation.equalsIgnoreCase(previousLocation)) {
                riskScore += 10;
                reasons.add("location_shift");
            }
        }

        riskScore = Math.min(100, riskScore);

        String status;
        if (riskScore >= 85) {
            status = "BLOCKED";
        } else if (riskScore >= 60) {
            status = "FLAGGED";
        } else {
            status = "APPROVED";
        }

        String fallbackReason = reasons.isEmpty()
                ? "baseline_safe_profile"
                : String.join(", ", reasons);

        log.info("Fallback evaluation for txId={}: status={} score={} reason={}",
                tx.getTransactionId(), status, riskScore, fallbackReason);
        return new EvaluatedEvent(tx, status, "Fallback Mode: " + reason + " | Signals: " + fallbackReason, riskScore);
    }

    /** Exposes circuit breaker state for health checks and metrics. */
    public CircuitBreaker getCircuitBreaker() {
        return circuitBreaker;
    }
}
