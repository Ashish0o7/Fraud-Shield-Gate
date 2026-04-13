package com.shieldgate.ml.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TransactionData {
    @JsonProperty
    private String userId;

    @JsonProperty
    private double amount;

    @JsonProperty
    private String merchantCategory;

    @JsonProperty
    private String location;

    @JsonProperty
    private long timestamp;

    public String getUserId() {
        return userId;
    }

    public double getAmount() {
        return amount;
    }

    public String getMerchantCategory() {
        return merchantCategory;
    }

    public String getLocation() {
        return location;
    }

    public long getTimestamp() {
        return timestamp;
    }
}
