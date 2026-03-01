package com.shieldgate.health;

import com.codahale.metrics.health.HealthCheck;
import com.shieldgate.core.RabbitMQService;

public class RabbitMQHealthCheck extends HealthCheck {
    private final RabbitMQService service;

    public RabbitMQHealthCheck(RabbitMQService service) {
        this.service = service;
    }

    @Override
    protected Result check() {
        return service.isConnected()
                ? Result.healthy("RabbitMQ connection active")
                : Result.unhealthy("RabbitMQ connection lost");
    }
}
