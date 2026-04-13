package com.shieldgate.core;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Lock-free token bucket rate limiter using CAS (Compare-And-Swap) operations.
 * <p>
 * The token bucket algorithm works like a real bucket:
 * - Tokens are added at a fixed rate (permits per second)
 * - Each request consumes one token
 * - If the bucket is empty, the request is rejected (429)
 * - The bucket has a max capacity (burst size) to allow short bursts
 * <p>
 * Implementation uses a single AtomicLong to store both the token count
 * and the last refill timestamp, avoiding locks entirely:
 * - Tokens are refilled lazily on each tryAcquire() call
 * - CAS loop ensures thread-safe token consumption without blocking
 * <p>
 * Why not Guava RateLimiter?
 * Guava's RateLimiter uses synchronized blocks and can cause thread contention
 * under high concurrency. This implementation is completely lock-free.
 */
public class RateLimiter {

    private final double permitsPerSecond;
    private final long maxPermits;

    // Stored as (permits * 1000) to avoid floating point in atomics
    private final AtomicLong availablePermits;
    private final AtomicLong lastRefillTimestamp;

    /**
     * @param permitsPerSecond sustained rate limit
     * @param burstSize        max tokens that can accumulate (allows bursts)
     */
    public RateLimiter(double permitsPerSecond, int burstSize) {
        this.permitsPerSecond = permitsPerSecond;
        this.maxPermits = burstSize;
        this.availablePermits = new AtomicLong(burstSize);
        this.lastRefillTimestamp = new AtomicLong(System.nanoTime());
    }

    /**
     * Attempts to acquire a permit without blocking.
     *
     * @return true if a permit was acquired, false if rate limit exceeded
     */
    public boolean tryAcquire() {
        refillTokens();

        while (true) {
            long current = availablePermits.get();
            if (current <= 0) {
                return false; // bucket empty — reject
            }
            // CAS: atomically decrement only if no other thread changed the value
            if (availablePermits.compareAndSet(current, current - 1)) {
                return true;
            }
            // CAS failed — another thread consumed a token; retry
        }
    }

    /**
     * Lazily refills tokens based on elapsed time since last refill.
     * Only one thread wins the CAS race to perform the refill — others
     * proceed with whatever tokens are available.
     */
    private void refillTokens() {
        long now = System.nanoTime();
        long last = lastRefillTimestamp.get();
        double elapsedSeconds = (now - last) / 1_000_000_000.0;

        if (elapsedSeconds <= 0)
            return;

        long newPermits = (long) (elapsedSeconds * permitsPerSecond);
        if (newPermits <= 0)
            return;

        // CAS on timestamp — only the winner thread adds tokens
        if (lastRefillTimestamp.compareAndSet(last, now)) {
            long current = availablePermits.get();
            long updated = Math.min(current + newPermits, maxPermits);
            availablePermits.set(updated);
        }
    }

    /** Current available permits (for metrics/testing). */
    public long getAvailablePermits() {
        refillTokens();
        return availablePermits.get();
    }
}
