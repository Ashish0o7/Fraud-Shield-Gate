package com.shieldgate.core;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the lock-free token bucket rate limiter.
 */
class RateLimiterTest {

    @Test
    @DisplayName("Allows requests up to burst capacity")
    void burstCapacity() {
        RateLimiter limiter = new RateLimiter(10, 5); // 10/s, burst 5

        // Should allow exactly 5 requests (burst size)
        for (int i = 0; i < 5; i++) {
            assertTrue(limiter.tryAcquire(), "Request " + (i + 1) + " should be allowed");
        }

        // 6th request should be rejected — bucket empty
        assertFalse(limiter.tryAcquire(), "Should reject after burst capacity exhausted");
    }

    @Test
    @DisplayName("Refills tokens over time")
    void refillsOverTime() throws InterruptedException {
        RateLimiter limiter = new RateLimiter(100, 5); // 100/s = 1 token every 10ms

        // Exhaust all tokens
        for (int i = 0; i < 5; i++) {
            limiter.tryAcquire();
        }
        assertFalse(limiter.tryAcquire(), "Should be empty");

        // Wait for refill (100ms should add ~10 tokens, capped at burst=5)
        Thread.sleep(100);

        assertTrue(limiter.tryAcquire(), "Should have refilled after waiting");
    }

    @Test
    @DisplayName("Available permits never exceed burst capacity")
    void cappedAtBurstSize() throws InterruptedException {
        RateLimiter limiter = new RateLimiter(1000, 10); // high rate, burst 10

        Thread.sleep(100); // would theoretically add 100 tokens

        long available = limiter.getAvailablePermits();
        assertTrue(available <= 10, "Permits should be capped at burst capacity, got: " + available);
    }

    @Test
    @DisplayName("Concurrent access doesn't corrupt state")
    void concurrentAccess() throws InterruptedException {
        RateLimiter limiter = new RateLimiter(1000, 100); // 1000/s, burst 100

        Thread[] threads = new Thread[10];
        int[] acquired = new int[10];

        for (int i = 0; i < threads.length; i++) {
            final int idx = i;
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 20; j++) {
                    if (limiter.tryAcquire()) {
                        acquired[idx]++;
                    }
                }
            });
        }

        for (Thread t : threads)
            t.start();
        for (Thread t : threads)
            t.join();

        int totalAcquired = 0;
        for (int a : acquired)
            totalAcquired += a;

        // Total acquired should not exceed burst capacity (100) + any refills during
        // test
        // Since the test is fast, there shouldn't be many refills
        assertTrue(totalAcquired <= 120,
                "Total acquired should be near burst capacity, got: " + totalAcquired);
        assertTrue(totalAcquired > 0, "At least some requests should succeed");
    }
}
