package com.shieldgate.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class EvaluatedEvent extends Transaction {
    private String status; // APPROVED, FLAGGED, BLOCKED
    private String riskReason; // fraud rule that triggered, null if approved
    private int riskScore; // 0-100 rule-based score
    // ML fields — populated after mget from ml-anomaly-scores index
    private Double anomalyScore; // 0.0-1.0 Isolation Forest score, null if not yet scored
    private Boolean isAnomaly; // true if ML model flagged as anomalous

    public EvaluatedEvent() {
    }

    public EvaluatedEvent(Transaction tx, String status, String riskReason, int riskScore) {
        this.setTransactionId(tx.getTransactionId());
        this.setUserId(tx.getUserId());
        this.setAmount(tx.getAmount());
        this.setMerchantCategory(tx.getMerchantCategory());
        this.setLocation(tx.getLocation());
        this.setTimestamp(tx.getTimestamp());
        this.status = status;
        this.riskReason = riskReason;
        this.riskScore = riskScore;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRiskReason() {
        return riskReason;
    }

    public void setRiskReason(String riskReason) {
        this.riskReason = riskReason;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(int riskScore) {
        this.riskScore = riskScore;
    }

    public Double getAnomalyScore() {
        return anomalyScore;
    }

    public void setAnomalyScore(Double anomalyScore) {
        this.anomalyScore = anomalyScore;
    }

    public Boolean getIsAnomaly() {
        return isAnomaly;
    }

    public void setIsAnomaly(Boolean isAnomaly) {
        this.isAnomaly = isAnomaly;
    }
}
