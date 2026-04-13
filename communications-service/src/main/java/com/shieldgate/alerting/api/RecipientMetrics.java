package com.shieldgate.alerting.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RecipientMetrics {
    private String recipientId;
    private String recipientName;
    private String recipientEmail;
    private long totalNotifications;
    private long deliveredCount;
    private long failedCount;
    private long blockedCount;
    private long flaggedCount;
    private String lastSentAt;

    @JsonProperty
    public String getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(String recipientId) {
        this.recipientId = recipientId;
    }

    @JsonProperty
    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    @JsonProperty
    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    @JsonProperty
    public long getTotalNotifications() {
        return totalNotifications;
    }

    public void setTotalNotifications(long totalNotifications) {
        this.totalNotifications = totalNotifications;
    }

    @JsonProperty
    public long getDeliveredCount() {
        return deliveredCount;
    }

    public void setDeliveredCount(long deliveredCount) {
        this.deliveredCount = deliveredCount;
    }

    @JsonProperty
    public long getFailedCount() {
        return failedCount;
    }

    public void setFailedCount(long failedCount) {
        this.failedCount = failedCount;
    }

    @JsonProperty
    public long getBlockedCount() {
        return blockedCount;
    }

    public void setBlockedCount(long blockedCount) {
        this.blockedCount = blockedCount;
    }

    @JsonProperty
    public long getFlaggedCount() {
        return flaggedCount;
    }

    public void setFlaggedCount(long flaggedCount) {
        this.flaggedCount = flaggedCount;
    }

    @JsonProperty
    public String getLastSentAt() {
        return lastSentAt;
    }

    public void setLastSentAt(String lastSentAt) {
        this.lastSentAt = lastSentAt;
    }
}
