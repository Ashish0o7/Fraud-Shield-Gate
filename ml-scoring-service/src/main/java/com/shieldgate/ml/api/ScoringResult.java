package com.shieldgate.ml.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ScoringResult {
    @JsonProperty
    private double anomalyScore;

    @JsonProperty
    private boolean isAnomaly;

    @JsonProperty
    private String explanation;

    public ScoringResult() {
    }

    public ScoringResult(double anomalyScore, boolean isAnomaly, String explanation) {
        this.anomalyScore = anomalyScore;
        this.isAnomaly = isAnomaly;
        this.explanation = explanation;
    }
}
