package com.shieldgate.alerting.health;

import com.codahale.metrics.health.HealthCheck;
import com.rabbitmq.client.Connection;

/**
 * Health check for the RabbitMQ connection used by the notification consumer.
 * Registered at /admin/healthcheck — used by load balancers and orchestrators.
 */
public class RabbitMQHealthCheck extends HealthCheck {

    private final ConnectionProvider connectionProvider;

    /**
     * We accept a functional interface rather than a direct Connection reference
     * because the connection is created lazily in the consumer's start() method.
     * This avoids a null reference if the health check runs before the consumer
     * starts.
     */
    @FunctionalInterface
    public interface ConnectionProvider {
        Connection getConnection();
    }

    public RabbitMQHealthCheck(ConnectionProvider connectionProvider) {
        this.connectionProvider = connectionProvider;
    }

    @Override
    protected Result check() {
        try {
            Connection conn = connectionProvider.getConnection();
            if (conn == null) {
                return Result.unhealthy("Connection not yet established");
            }
            if (!conn.isOpen()) {
                return Result.unhealthy("Connection is closed");
            }
            return Result.healthy("Connected to %s:%d",
                    conn.getAddress().getHostAddress(), conn.getPort());
        } catch (Exception e) {
            return Result.unhealthy("Failed to check connection: " + e.getMessage());
        }
    }
}
