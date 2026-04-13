package com.shieldgate.health;

import com.codahale.metrics.health.HealthCheck;
import com.shieldgate.core.AerospikeService;

public class AerospikeHealthCheck extends HealthCheck {
    private final AerospikeService service;

    public AerospikeHealthCheck(AerospikeService service) {
        this.service = service;
    }

    @Override
    protected Result check() {
        return service.isConnected()
                ? Result.healthy("Aerospike connection active")
                : Result.unhealthy("Aerospike connection lost");
    }
}
