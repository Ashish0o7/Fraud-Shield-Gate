package com.shieldgate.alerting.health;

import com.codahale.metrics.health.HealthCheck;
import org.jdbi.v3.core.Jdbi;

/**
 * Health check for the PostgreSQL database connection.
 * Executes a simple validation query to ensure the database is reachable.
 */
public class DatabaseHealthCheck extends HealthCheck {

    private final Jdbi jdbi;

    public DatabaseHealthCheck(Jdbi jdbi) {
        this.jdbi = jdbi;
    }

    @Override
    protected Result check() {
        try {
            jdbi.useHandle(handle -> handle.execute("SELECT 1"));
            return Result.healthy("PostgreSQL is reachable");
        } catch (Exception e) {
            return Result.unhealthy("PostgreSQL is unreachable: " + e.getMessage());
        }
    }
}
