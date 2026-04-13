package com.shieldgate.resources;

import com.shieldgate.api.EvaluatedEvent;
import com.shieldgate.api.Transaction;
import com.shieldgate.api.UserState;
import com.shieldgate.core.AerospikeService;
import com.shieldgate.core.FraudRulesEngine;
import com.shieldgate.core.RabbitMQService;
import com.shieldgate.core.RateLimiter;

import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.Random;

/**
 * Transaction ingestion endpoint — the main entry point for the fraud pipeline.
 *
 * Production features:
 * - Rate limiting (token-bucket, 200 req/s sustained with burst of 500)
 * - Request correlation ID (X-Request-ID) propagated via MDC for tracing
 * - Processing time header for observability
 */
@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class IngestResource {
    private static final Logger log = LoggerFactory.getLogger(IngestResource.class);

    private final AerospikeService aerospikeService;
    private final FraudRulesEngine rulesEngine;
    private final RabbitMQService rabbitMQService;
    private final ExecutorService executor;
    private final Random random = new Random();

    /** Rate limiter: 200 requests/second sustained, burst up to 500 */
    private final RateLimiter rateLimiter = new RateLimiter(200, 500);

    public IngestResource(AerospikeService aerospikeService, FraudRulesEngine rulesEngine,
            RabbitMQService rabbitMQService, ExecutorService executor) {
        this.aerospikeService = aerospikeService;
        this.rulesEngine = rulesEngine;
        this.rabbitMQService = rabbitMQService;
        this.executor = executor;
    }

    @POST
    @Path("/ingest")
    public Response ingest(@Valid Transaction tx) {
        long startTime = System.nanoTime();

        // ── Rate limit check ──
        if (!rateLimiter.tryAcquire()) {
            log.warn("Rate limit exceeded — rejecting request");
            return Response.status(429)
                    .entity(Map.of("error", "Rate limit exceeded — try again shortly"))
                    .build();
        }

        // ── Correlation ID for distributed tracing ──
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("requestId", requestId);

        try {
            if (tx.getTransactionId() == null) {
                tx.setTransactionId(UUID.randomUUID());
            }
            if (tx.getTimestamp() == 0) {
                tx.setTimestamp(System.currentTimeMillis());
            }

            // Read current user state from Aerospike
            UserState state = aerospikeService.getUserState(tx.getUserId());
            boolean isNewUser = (state == null);
            if (isNewUser) {
                state = new UserState(tx.getUserId(), 80, 0, null, 0);
            }

            // Evaluate fraud rules (with circuit breaker protection on ML call)
            EvaluatedEvent event = rulesEngine.evaluate(tx, state);

            // Dynamic trust score adjustment based on evaluation result
            int updatedTrust = state.getTrustScore();
            if ("BLOCKED".equals(event.getStatus())) {
                updatedTrust = Math.max(0, updatedTrust - 15);
            } else if ("FLAGGED".equals(event.getStatus())) {
                updatedTrust = Math.max(0, updatedTrust - 5);
            } else {
                updatedTrust = Math.min(100, updatedTrust + 1);
            }

            // Persist user state — atomic increment for txCount to avoid race condition
            if (isNewUser) {
                state.setTrustScore(updatedTrust);
                state.setTxCountLast10Mins(1);
                state.setLastLocation(tx.getLocation());
                state.setLastTxTimestamp(tx.getTimestamp());
                aerospikeService.saveUserState(state);
            } else {
                aerospikeService.updateUserStateAtomically(
                        tx.getUserId(), tx.getLocation(), tx.getTimestamp(), updatedTrust);
            }

            // Reliable publish with confirms + bounded retries.
            if (!rabbitMQService.publishEventReliably(event)) {
                log.error("Failed to reliably publish txId={} after retries", tx.getTransactionId());
                return Response.status(503)
                        .entity(Map.of(
                                "error", "Event pipeline temporarily unavailable",
                                "txId", String.valueOf(tx.getTransactionId())))
                        .header("X-Request-ID", requestId)
                        .build();
            }

            long elapsedMs = (System.nanoTime() - startTime) / 1_000_000;
            log.info("Processed txId={} → {} in {}ms", tx.getTransactionId(), event.getStatus(), elapsedMs);

            return Response.ok(event)
                    .header("X-Request-ID", requestId)
                    .header("X-Processing-Time-Ms", elapsedMs)
                    .build();

        } catch (Exception e) {
            log.error("Failed to process transaction txId={}", tx.getTransactionId(), e);
            return Response.serverError()
                    .entity(Map.of("error", "Transaction processing failed",
                            "txId", String.valueOf(tx.getTransactionId())))
                    .header("X-Request-ID", requestId)
                    .build();
        } finally {
            MDC.remove("requestId");
        }
    }

    @POST
    @Path("/demo/flood")
    public Response flood(@QueryParam("count") @DefaultValue("100") int count,
            @QueryParam("cleanBias") @DefaultValue("95") int cleanBias) {
        String[] locations = { "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata" };
        String[] safeCategories = { "RETAIL", "TRAVEL" };
        String[] riskyCategories = { "CRYPTO", "GAMING" };
        int safeTrafficBias = Math.max(50, Math.min(cleanBias, 99));
        String floodBatchId = "demo-" + System.currentTimeMillis();

        for (int i = 0; i < count; i++) {
            executor.submit(() -> {
                try {
                    Transaction tx = new Transaction();
                    tx.setTransactionId(UUID.randomUUID());
                    int userIdx = random.nextInt(Math.max(1000, count * 2));
                    tx.setUserId(floodBatchId + "-user-" + userIdx);

                    // Demo profile: keep most traffic "normal"; cleanBias controls safe-traffic share.
                    int bucket = random.nextInt(100);
                    int amount;
                    if (bucket < safeTrafficBias) {
                        amount = random.nextInt(6000) + 200;
                    } else if (bucket < Math.min(99, safeTrafficBias + 3)) {
                        amount = random.nextInt(25000) + 6000;
                    } else {
                        amount = random.nextInt(100000) + 40000;
                    }
                    tx.setAmount(BigDecimal.valueOf(amount));

                    String homeLocation = locations[userIdx % locations.length];
                    String locationStability = safeTrafficBias >= 95 ? "high" : "medium";
                    int stableLocationChance = "high".equals(locationStability) ? 98 : 95;
                    String location = random.nextInt(100) < stableLocationChance
                            ? homeLocation
                            : locations[random.nextInt(locations.length)];
                    tx.setLocation(location);

                    String category = bucket < safeTrafficBias
                            ? safeCategories[random.nextInt(safeCategories.length)]
                            : (bucket < Math.min(99, safeTrafficBias + 3)
                                    ? safeCategories[random.nextInt(safeCategories.length)]
                                    : riskyCategories[random.nextInt(riskyCategories.length)]);
                    tx.setMerchantCategory(category);
                    tx.setTimestamp(System.currentTimeMillis());

                    ingest(tx);
                } catch (Exception e) {
                    log.error("Error in flood task", e);
                }
            });
        }
        return Response.accepted()
                .entity(Map.of("status", "accepted", "count", count, "cleanBias", safeTrafficBias))
                .build();
    }
}
