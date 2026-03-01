package com.shieldgate.resources;

import com.shieldgate.api.EvaluatedEvent;
import com.shieldgate.api.Transaction;
import com.shieldgate.api.UserState;
import com.shieldgate.core.AerospikeService;
import com.shieldgate.core.FraudRulesEngine;
import com.shieldgate.core.RabbitMQService;

import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.Random;

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

            // Evaluate fraud rules
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

            // Publish to RabbitMQ fanout for downstream consumers
            rabbitMQService.publishEvent(event);

            return Response.ok(event).build();

        } catch (Exception e) {
            log.error("Failed to process transaction txId={}", tx.getTransactionId(), e);
            return Response.serverError()
                    .entity(Map.of("error", "Transaction processing failed",
                            "txId", String.valueOf(tx.getTransactionId())))
                    .build();
        }
    }

    @POST
    @Path("/demo/flood")
    public Response flood(@QueryParam("count") @DefaultValue("100") int count) {
        String[] locations = { "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata" };
        String[] categories = { "RETAIL", "TRAVEL", "CRYPTO", "GAMING" };

        for (int i = 0; i < count; i++) {
            executor.submit(() -> {
                try {
                    Transaction tx = new Transaction();
                    tx.setTransactionId(UUID.randomUUID());
                    tx.setUserId("user-" + random.nextInt(1000));
                    tx.setAmount(BigDecimal.valueOf(random.nextInt(200000) + 10));
                    tx.setMerchantCategory(categories[random.nextInt(categories.length)]);
                    tx.setLocation(locations[random.nextInt(locations.length)]);
                    tx.setTimestamp(System.currentTimeMillis());

                    ingest(tx);
                } catch (Exception e) {
                    log.error("Error in flood task", e);
                }
            });
        }
        return Response.accepted()
                .entity(Map.of("status", "accepted", "count", count))
                .build();
    }
}
