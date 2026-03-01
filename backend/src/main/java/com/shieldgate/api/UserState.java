package com.shieldgate.api;

public class UserState {
    private String userId;
    private int trustScore;
    private int txCountLast10Mins;
    private String lastLocation;
    private long lastTxTimestamp;

    public UserState() {
    }

    public UserState(String userId, int trustScore, int txCountLast10Mins, String lastLocation, long lastTxTimestamp) {
        this.userId = userId;
        this.trustScore = trustScore;
        this.txCountLast10Mins = txCountLast10Mins;
        this.lastLocation = lastLocation;
        this.lastTxTimestamp = lastTxTimestamp;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public int getTrustScore() {
        return trustScore;
    }

    public void setTrustScore(int trustScore) {
        this.trustScore = trustScore;
    }

    public int getTxCountLast10Mins() {
        return txCountLast10Mins;
    }

    public void setTxCountLast10Mins(int txCountLast10Mins) {
        this.txCountLast10Mins = txCountLast10Mins;
    }

    public String getLastLocation() {
        return lastLocation;
    }

    public void setLastLocation(String lastLocation) {
        this.lastLocation = lastLocation;
    }

    public long getLastTxTimestamp() {
        return lastTxTimestamp;
    }

    public void setLastTxTimestamp(long lastTxTimestamp) {
        this.lastTxTimestamp = lastTxTimestamp;
    }
}
