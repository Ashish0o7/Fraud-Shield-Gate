package com.shieldgate.alerting.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * User model stored in PostgreSQL.
 *
 * Two identity fields:
 * - id (long) — internal BIGSERIAL PK, never exposed to external systems
 * - userId (String) — externally-visible ID used in fraud pipeline, e.g.
 * "usr_a3f9b2c1"
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class User {
    private long id; // internal DB PK
    private String userId; // e.g. "usr_a3f9b2c1" — used in transactions
    private String email;
    private String name;
    private String location;
    private String passwordHash;
    private boolean notifyBlocked;
    private boolean notifyFlagged;
    private String createdAt;

    public User() {
    }

    // ── Internal PK — not serialized to API responses
    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    // ── External user ID — this is what clients use
    @JsonProperty("id") // serialized as "id" so the frontend doesn't change
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    @JsonProperty
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    @JsonProperty
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @JsonProperty
    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    @JsonProperty
    public boolean isNotifyBlocked() {
        return notifyBlocked;
    }

    public void setNotifyBlocked(boolean notifyBlocked) {
        this.notifyBlocked = notifyBlocked;
    }

    @JsonProperty
    public boolean isNotifyFlagged() {
        return notifyFlagged;
    }

    public void setNotifyFlagged(boolean notifyFlagged) {
        this.notifyFlagged = notifyFlagged;
    }

    @JsonProperty
    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
