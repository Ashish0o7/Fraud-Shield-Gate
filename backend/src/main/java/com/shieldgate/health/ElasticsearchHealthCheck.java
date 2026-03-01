package com.shieldgate.health;

import com.codahale.metrics.health.HealthCheck;
import com.shieldgate.core.ElasticsearchService;

public class ElasticsearchHealthCheck extends HealthCheck {
    private final ElasticsearchService service;

    public ElasticsearchHealthCheck(ElasticsearchService service) {
        this.service = service;
    }

    @Override
    protected Result check() {
        return service.isHealthy()
                ? Result.healthy("Elasticsearch cluster reachable")
                : Result.unhealthy("Elasticsearch cluster unreachable");
    }
}
