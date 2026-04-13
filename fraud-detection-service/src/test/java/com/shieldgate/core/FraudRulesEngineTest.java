package com.shieldgate.core;

import com.shieldgate.api.EvaluatedEvent;
import com.shieldgate.api.Transaction;
import com.shieldgate.api.UserState;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the FraudRulesEngine.
 *
 * Since the ML service is external, we test:
 * 1. Fallback behavior when ML service is unreachable
 * 2. The circuit breaker integration (verifying it trips and recovers)
 * 3. High-amount transaction blocking in fallback mode
 */
class FraudRulesEngineTest {

    /**
     * Use a non-existent host to force ML service failure.
     * This tests the fallback path and circuit breaker interaction.
     */
    private FraudRulesEngine createEngineWithUnreachableMl() {
        return new FraudRulesEngine("http://192.0.2.1:9999"); // RFC 5737 TEST-NET
    }

    private Transaction createTransaction(String userId, double amount, String category, String location) {
        Transaction tx = new Transaction();
        tx.setTransactionId(UUID.randomUUID());
        tx.setUserId(userId);
        tx.setAmount(BigDecimal.valueOf(amount));
        tx.setMerchantCategory(category);
        tx.setLocation(location);
        tx.setTimestamp(System.currentTimeMillis());
        return tx;
    }

    @Test
    @DisplayName("Falls back to rule-based scoring when ML service is unreachable")
    void fallbackWhenMlUnreachable() {
        FraudRulesEngine engine = createEngineWithUnreachableMl();
        Transaction tx = createTransaction("user-1", 5000, "RETAIL", "Mumbai");
        UserState state = new UserState("user-1", 80, 1, "Mumbai", System.currentTimeMillis());

        EvaluatedEvent event = engine.evaluate(tx, state);

        assertNotNull(event, "Should return an event even when ML is down");
        assertEquals("APPROVED", event.getStatus(), "Low-amount tx should be APPROVED in fallback");
        assertTrue(event.getRiskReason().contains("Fallback Mode"),
                "Risk reason should indicate fallback mode");
    }

    @Test
    @DisplayName("Fallback blocks high-amount transactions (>₹100,000)")
    void fallbackBlocksHighAmount() {
        FraudRulesEngine engine = createEngineWithUnreachableMl();
        Transaction tx = createTransaction("user-2", 200000, "CRYPTO", "Mumbai");
        UserState state = new UserState("user-2", 50, 3, "Delhi", System.currentTimeMillis());

        EvaluatedEvent event = engine.evaluate(tx, state);

        assertEquals("BLOCKED", event.getStatus(),
                "High-amount transaction should be BLOCKED in fallback");
        assertTrue(event.getRiskScore() >= 75,
                "Fallback risk score for high-amount profile should be high enough to block");
    }

    @Test
    @DisplayName("Handles null UserState (new user)")
    void handlesNullUserState() {
        FraudRulesEngine engine = createEngineWithUnreachableMl();
        Transaction tx = createTransaction("new-user", 1000, "RETAIL", "Mumbai");

        EvaluatedEvent event = engine.evaluate(tx, null);

        assertNotNull(event, "Should handle null UserState gracefully");
        assertNotNull(event.getStatus());
    }

    @Test
    @DisplayName("Circuit breaker trips after repeated ML failures")
    void circuitBreakerTrips() {
        FraudRulesEngine engine = createEngineWithUnreachableMl();
        UserState state = new UserState("user-3", 80, 0, "Mumbai", 0);

        // Trigger 5 failures (circuit breaker threshold)
        for (int i = 0; i < 5; i++) {
            Transaction tx = createTransaction("user-3", 100, "RETAIL", "Mumbai");
            engine.evaluate(tx, state);
        }

        // Circuit should now be OPEN
        assertEquals(CircuitBreaker.State.OPEN, engine.getCircuitBreaker().getState(),
                "Circuit breaker should be OPEN after 5 consecutive failures");
    }

    @Test
    @DisplayName("Circuit breaker causes fast fail (doesn't wait for ML timeout)")
    void circuitBreakerFastFail() {
        FraudRulesEngine engine = createEngineWithUnreachableMl();
        UserState state = new UserState("user-4", 80, 0, "Mumbai", 0);

        // Trip the breaker
        for (int i = 0; i < 5; i++) {
            engine.evaluate(createTransaction("user-4", 100, "RETAIL", "Mumbai"), state);
        }

        // Now the circuit is OPEN — subsequent calls should be very fast (no HTTP
        // timeout)
        long start = System.nanoTime();
        EvaluatedEvent event = engine.evaluate(
                createTransaction("user-4", 100, "RETAIL", "Mumbai"), state);
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        assertNotNull(event);
        assertTrue(elapsedMs < 100,
                "Circuit breaker fast-fail should complete in <100ms, took: " + elapsedMs + "ms");
        assertTrue(event.getRiskReason().contains("Circuit breaker open"),
                "Should indicate circuit breaker is open");
    }

    @Test
    @DisplayName("Preserves transaction ID through evaluation")
    void preservesTransactionId() {
        FraudRulesEngine engine = createEngineWithUnreachableMl();
        Transaction tx = createTransaction("user-5", 1000, "RETAIL", "Mumbai");
        UUID originalId = tx.getTransactionId();

        EvaluatedEvent event = engine.evaluate(tx, null);

        assertEquals(originalId, event.getTransactionId(),
                "Transaction ID should be preserved in evaluated event");
    }
}
