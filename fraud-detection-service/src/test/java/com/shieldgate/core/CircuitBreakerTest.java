package com.shieldgate.core;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the hand-rolled circuit breaker implementation.
 * Validates all state transitions and thread-safety invariants.
 */
class CircuitBreakerTest {

    // ── Helper: injectable clock for deterministic time control ──

    static class TickClock extends Clock {
        private long millis;

        TickClock(long millis) {
            this.millis = millis;
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis);
        }

        void advance(long ms) {
            millis += ms;
        }
    }

    @Test
    @DisplayName("Starts in CLOSED state — all requests allowed")
    void closedByDefault() {
        CircuitBreaker cb = new CircuitBreaker("test", 3, Duration.ofSeconds(10));
        assertEquals(CircuitBreaker.State.CLOSED, cb.getState());
        assertTrue(cb.allowRequest());
    }

    @Test
    @DisplayName("CLOSED → OPEN after reaching failure threshold")
    void tripsAfterThreshold() {
        CircuitBreaker cb = new CircuitBreaker("test", 3, Duration.ofSeconds(10));

        cb.recordFailure();
        cb.recordFailure();
        assertEquals(CircuitBreaker.State.CLOSED, cb.getState(), "Should still be CLOSED before threshold");

        cb.recordFailure(); // 3rd failure → trips
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());
        assertFalse(cb.allowRequest(), "OPEN state should reject requests");
    }

    @Test
    @DisplayName("Success resets failure count in CLOSED state")
    void successResetsClosed() {
        CircuitBreaker cb = new CircuitBreaker("test", 3, Duration.ofSeconds(10));

        cb.recordFailure();
        cb.recordFailure();
        cb.recordSuccess(); // resets counter

        cb.recordFailure(); // only 1 failure now, not 3
        assertEquals(CircuitBreaker.State.CLOSED, cb.getState());
    }

    @Test
    @DisplayName("OPEN → HALF_OPEN after timeout elapses")
    void transitionsToHalfOpenAfterTimeout() {
        TickClock clock = new TickClock(1000);
        CircuitBreaker cb = new CircuitBreaker("test", 2, Duration.ofSeconds(5), clock);

        // Trip the breaker
        cb.recordFailure();
        cb.recordFailure();
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());

        // Before timeout: still OPEN
        clock.advance(3000);
        assertFalse(cb.allowRequest());
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());

        // After timeout: transitions to HALF_OPEN
        clock.advance(3000); // total 6s > 5s timeout
        assertTrue(cb.allowRequest());
        assertEquals(CircuitBreaker.State.HALF_OPEN, cb.getState());
    }

    @Test
    @DisplayName("HALF_OPEN → CLOSED on success (recovery confirmed)")
    void halfOpenRecovery() {
        TickClock clock = new TickClock(1000);
        CircuitBreaker cb = new CircuitBreaker("test", 2, Duration.ofSeconds(5), clock);

        // Trip to OPEN, then wait for HALF_OPEN
        cb.recordFailure();
        cb.recordFailure();
        clock.advance(6000);
        cb.allowRequest(); // triggers HALF_OPEN

        // Probe succeeds → should close
        cb.recordSuccess();
        assertEquals(CircuitBreaker.State.CLOSED, cb.getState());
        assertEquals(0, cb.getFailureCount(), "Failure count should reset after recovery");
    }

    @Test
    @DisplayName("HALF_OPEN → OPEN on failure (probe failed)")
    void halfOpenFailure() {
        TickClock clock = new TickClock(1000);
        CircuitBreaker cb = new CircuitBreaker("test", 2, Duration.ofSeconds(5), clock);

        // Trip to OPEN, then wait for HALF_OPEN
        cb.recordFailure();
        cb.recordFailure();
        clock.advance(6000);
        cb.allowRequest(); // triggers HALF_OPEN

        // Probe fails → back to OPEN
        cb.recordFailure();
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());
    }

    @Test
    @DisplayName("Tracks success counter across lifecycle")
    void tracksSuccessCount() {
        CircuitBreaker cb = new CircuitBreaker("test", 5, Duration.ofSeconds(10));

        cb.recordSuccess();
        cb.recordSuccess();
        cb.recordSuccess();

        assertEquals(3, cb.getSuccessCount());
    }

    @Test
    @DisplayName("Concurrent failures don't overshoot state transitions")
    void concurrentSafety() throws InterruptedException {
        CircuitBreaker cb = new CircuitBreaker("test", 5, Duration.ofSeconds(30));

        Thread[] threads = new Thread[20];
        for (int i = 0; i < threads.length; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 10; j++) {
                    cb.recordFailure();
                }
            });
        }

        for (Thread t : threads)
            t.start();
        for (Thread t : threads)
            t.join();

        // Should be OPEN — doesn't matter which thread tripped it
        assertEquals(CircuitBreaker.State.OPEN, cb.getState());
    }
}
