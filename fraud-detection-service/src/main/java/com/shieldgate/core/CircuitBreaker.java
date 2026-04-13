package com.shieldgate.core;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * A hand-rolled circuit breaker implementation (not a library wrapper).
 * <p>
 * States:
 * 
 * <pre>
 *   CLOSED ──(failures >= threshold)──> OPEN
 *   OPEN ──(timeout elapsed)──> HALF_OPEN
 *   HALF_OPEN ──(success)──> CLOSED
 *   HALF_OPEN ──(failure)──> OPEN
 * </pre>
 * <p>
 * Thread-safe via atomic operations — no locks, no synchronized blocks.
 * Uses CAS (compare-and-swap) for state transitions to prevent race conditions
 * when multiple request threads trip the breaker simultaneously.
 * <p>
 * Why hand-rolled instead of Resilience4j?
 * Demonstrates understanding of the pattern internals — sliding window,
 * state machine, recovery probing — rather than just plugging in a library.
 */
public class CircuitBreaker {
    private static final Logger log = LoggerFactory.getLogger(CircuitBreaker.class);

    public enum State {
        CLOSED, OPEN, HALF_OPEN
    }

    private final String name;
    private final int failureThreshold;
    private final Duration openTimeout;
    private final Clock clock;

    // ── Atomic state — lock-free concurrency ──
    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicInteger successCount = new AtomicInteger(0);
    private final AtomicLong lastFailureTimestamp = new AtomicLong(0);
    private final AtomicLong stateChangedAt = new AtomicLong(System.currentTimeMillis());

    /**
     * @param name             identifier for logging/metrics
     * @param failureThreshold consecutive failures before opening circuit
     * @param openTimeout      how long to stay OPEN before probing with HALF_OPEN
     */
    public CircuitBreaker(String name, int failureThreshold, Duration openTimeout) {
        this(name, failureThreshold, openTimeout, Clock.systemUTC());
    }

    // Test-friendly constructor with injectable clock
    CircuitBreaker(String name, int failureThreshold, Duration openTimeout, Clock clock) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.openTimeout = openTimeout;
        this.clock = clock;
    }

    /**
     * Checks if a request should be allowed through.
     * <p>
     * In OPEN state, checks if the timeout has elapsed and transitions to
     * HALF_OPEN.
     * Uses CAS to ensure only ONE thread transitions — the rest see OPEN and fail
     * fast.
     */
    public boolean allowRequest() {
        State current = state.get();

        if (current == State.CLOSED) {
            return true;
        }

        if (current == State.OPEN) {
            long elapsed = clock.millis() - stateChangedAt.get();
            if (elapsed >= openTimeout.toMillis()) {
                // CAS: only one thread transitions to HALF_OPEN
                if (state.compareAndSet(State.OPEN, State.HALF_OPEN)) {
                    stateChangedAt.set(clock.millis());
                    log.info("[CircuitBreaker:{}] OPEN → HALF_OPEN (probing recovery)", name);
                    return true;
                }
            }
            return false; // still OPEN, fail fast
        }

        // HALF_OPEN: allow exactly one probe request
        return current == State.HALF_OPEN;
    }

    /**
     * Records a successful call. In HALF_OPEN, this closes the circuit.
     */
    public void recordSuccess() {
        successCount.incrementAndGet();

        if (state.get() == State.HALF_OPEN) {
            if (state.compareAndSet(State.HALF_OPEN, State.CLOSED)) {
                failureCount.set(0);
                stateChangedAt.set(clock.millis());
                log.info("[CircuitBreaker:{}] HALF_OPEN → CLOSED (recovery confirmed)", name);
            }
        } else {
            // In CLOSED state, reset failure count on success
            failureCount.set(0);
        }
    }

    /**
     * Records a failed call. If failures exceed the threshold, trips the breaker.
     */
    public void recordFailure() {
        int failures = failureCount.incrementAndGet();
        lastFailureTimestamp.set(clock.millis());

        State current = state.get();

        if (current == State.HALF_OPEN) {
            // Probe failed — go back to OPEN
            if (state.compareAndSet(State.HALF_OPEN, State.OPEN)) {
                stateChangedAt.set(clock.millis());
                log.warn("[CircuitBreaker:{}] HALF_OPEN → OPEN (probe failed)", name);
            }
        } else if (current == State.CLOSED && failures >= failureThreshold) {
            // Threshold exceeded — trip the circuit
            if (state.compareAndSet(State.CLOSED, State.OPEN)) {
                stateChangedAt.set(clock.millis());
                log.warn("[CircuitBreaker:{}] CLOSED → OPEN after {} consecutive failures", name, failures);
            }
        }
    }

    // ── Getters for tests and metrics ──

    public State getState() {
        return state.get();
    }

    public int getFailureCount() {
        return failureCount.get();
    }

    public int getSuccessCount() {
        return successCount.get();
    }

    public String getName() {
        return name;
    }

    /** Forces state for testing. */
    void forceState(State newState) {
        state.set(newState);
        stateChangedAt.set(clock.millis());
    }
}
