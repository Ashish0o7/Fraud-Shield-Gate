package com.shieldgate.ml.resources;

import com.shieldgate.ml.api.ScoringResult;
import com.shieldgate.ml.api.TransactionData;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.Random;

@Path("/predict")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MlScoringResource {

    private final Random random = new Random();

    @POST
    public ScoringResult predict(TransactionData data) {
        // Simple ML logic heuristic simulation
        double score = calculateSimpleRiskThreshold(data);
        boolean isAnomaly = score > 0.75;
        String explanation = isAnomaly ? "Pattern diverges significantly from expected norms based on ML metrics"
                : "Transaction aligns with normal behavior vector";

        return new ScoringResult(score, isAnomaly, explanation);
    }

    private double calculateSimpleRiskThreshold(TransactionData data) {
        double risk = 0.1;

        // High amounts increase risk proportionally
        if (data.getAmount() > 100000) {
            risk += 0.4;
        } else if (data.getAmount() > 50000) {
            risk += 0.2;
        }

        // Risky merchants
        if ("CRYPTO".equalsIgnoreCase(data.getMerchantCategory()) ||
                "GAMING".equalsIgnoreCase(data.getMerchantCategory())) {
            risk += 0.3;
        }

        // Add minimal noise acting as an ML stochastic element
        risk += random.nextDouble() * 0.15;

        return Math.min(risk, 1.0);
    }
}
