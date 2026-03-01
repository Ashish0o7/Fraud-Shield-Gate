package com.shieldgate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shieldgate.core.*;
import com.shieldgate.health.*;
import com.shieldgate.managed.RabbitMQConsumer;
import com.shieldgate.resources.*;

import io.dropwizard.core.Application;
import io.dropwizard.core.setup.Bootstrap;
import io.dropwizard.core.setup.Environment;
import org.eclipse.jetty.servlets.CrossOriginFilter;
import org.eclipse.jetty.websocket.jakarta.server.config.JakartaWebSocketServletContainerInitializer;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterRegistration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.EnumSet;
import java.util.concurrent.ExecutorService;

public class ShieldGateApplication extends Application<ShieldGateConfiguration> {
    private static final Logger log = LoggerFactory.getLogger(ShieldGateApplication.class);

    public static void main(final String[] args) throws Exception {
        new ShieldGateApplication().run(args);
    }

    @Override
    public String getName() {
        return "ShieldGate";
    }

    @Override
    public void initialize(final Bootstrap<ShieldGateConfiguration> bootstrap) {
        // Initialization...
    }

    @Override
    public void run(final ShieldGateConfiguration config, final Environment env) throws Exception {
        // CORS config
        final FilterRegistration.Dynamic cors = env.servlets().addFilter("CORS", CrossOriginFilter.class);
        cors.setInitParameter(CrossOriginFilter.ALLOWED_ORIGINS_PARAM, "*");
        cors.setInitParameter(CrossOriginFilter.ALLOWED_HEADERS_PARAM,
                "X-Requested-With,Content-Type,Accept,Origin,Authorization");
        cors.setInitParameter(CrossOriginFilter.ALLOWED_METHODS_PARAM, "OPTIONS,GET,PUT,POST,DELETE,HEAD");
        cors.addMappingForUrlPatterns(EnumSet.allOf(DispatcherType.class), true, "/*");

        ObjectMapper mapper = env.getObjectMapper();

        // ── Core Services ──
        AerospikeService aerospikeService = new AerospikeService(
                config.getAerospikeHost(), config.getAerospikePort(), config.getAerospikeNamespace());

        RabbitMQService rabbitMQService = new RabbitMQService(
                config.getRabbitHost(), config.getRabbitPort(), mapper);

        ElasticsearchService elasticsearchService = new ElasticsearchService(
                config.getElasticHost(), config.getElasticPort(), mapper);

        FraudRulesEngine rulesEngine = new FraudRulesEngine();

        // ── Managed Lifecycle — Dropwizard handles graceful start/stop ──
        env.lifecycle().manage(aerospikeService);
        env.lifecycle().manage(rabbitMQService);
        env.lifecycle().manage(elasticsearchService);

        // ── Managed Thread Pool for flood demo endpoint ──
        ExecutorService floodExecutor = env.lifecycle()
                .executorService("flood-pool-%d")
                .maxThreads(50)
                .build();

        // ── RabbitMQ Consumers (fanout → ES, WebSocket, Alerts) ──
        RabbitMQConsumer consumer = new RabbitMQConsumer(
                config.getRabbitHost(), config.getRabbitPort(), mapper, elasticsearchService);
        env.lifecycle().manage(consumer);

        // ── JAX-RS Resources ──
        env.jersey().register(new IngestResource(aerospikeService, rulesEngine, rabbitMQService, floodExecutor));
        env.jersey().register(new AuditResource(elasticsearchService));

        // ── Health Checks — accessible at /admin/healthcheck ──
        env.healthChecks().register("aerospike", new AerospikeHealthCheck(aerospikeService));
        env.healthChecks().register("rabbitmq", new RabbitMQHealthCheck(rabbitMQService));
        env.healthChecks().register("elasticsearch", new ElasticsearchHealthCheck(elasticsearchService));

        // ── WebSocket Endpoint ──
        JakartaWebSocketServletContainerInitializer.configure(
                env.getApplicationContext(),
                (servletContext, wsContainer) -> {
                    wsContainer.setDefaultMaxTextMessageBufferSize(65535);
                    wsContainer.addEndpoint(com.shieldgate.ws.FraudWebSocket.class);
                });

        log.info("ShieldGate started successfully — all systems online");
    }
}
