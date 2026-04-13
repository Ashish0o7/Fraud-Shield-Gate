package com.shieldgate.managed;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.rabbitmq.client.*;
import com.shieldgate.api.EvaluatedEvent;
import com.shieldgate.core.ElasticsearchService;
import com.shieldgate.core.RedisBackplaneService;
import com.shieldgate.core.RabbitMQService;
import com.shieldgate.ws.FraudWebSocket;
import io.dropwizard.lifecycle.Managed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RabbitMQConsumer implements Managed {
    private static final Logger log = LoggerFactory.getLogger(RabbitMQConsumer.class);

    private final String host;
    private final int port;
    private final ObjectMapper mapper;
    private final ElasticsearchService elasticsearchService;
    private Connection connection;
    private Channel channel;
    private final WindowAggregator windowAggregator;
    private final RedisBackplaneService redisBackplaneService;

    private static final String SEARCH_QUEUE = "search.queue";
    private static final String DASHBOARD_QUEUE = "dashboard.stream.queue";
    private static final String ALERTS_QUEUE = "alerts.queue";

    public RabbitMQConsumer(String host, int port, ObjectMapper mapper, ElasticsearchService elasticsearchService,
            RedisBackplaneService redisBackplaneService) {
        this.host = host;
        this.port = port;
        this.mapper = mapper;
        this.elasticsearchService = elasticsearchService;
        this.redisBackplaneService = redisBackplaneService;
        this.windowAggregator = new WindowAggregator(mapper, redisBackplaneService);
    }

    @Override
    public void start() throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        connection = factory.newConnection();
        channel = connection.createChannel();
        windowAggregator.start();

        channel.queueDeclare(SEARCH_QUEUE, true, false, false, null);
        channel.queueBind(SEARCH_QUEUE, RabbitMQService.EXCHANGE_NAME, "");

        channel.queueDeclare(DASHBOARD_QUEUE, true, false, false, null);
        channel.queueBind(DASHBOARD_QUEUE, RabbitMQService.EXCHANGE_NAME, "");

        channel.queueDeclare(ALERTS_QUEUE, true, false, false, null);
        channel.queueBind(ALERTS_QUEUE, RabbitMQService.EXCHANGE_NAME, "");

        // Consumer 1: Search index — writes evaluated events into Elasticsearch
        DeliverCallback searchCallback = (consumerTag, delivery) -> {
            try {
                EvaluatedEvent event = mapper.readValue(delivery.getBody(), EvaluatedEvent.class);
                elasticsearchService.indexEvent(event);
            } catch (Exception e) {
                log.error("Failed to index event into Elasticsearch", e);
            }
        };

        // Consumer 2: Dashboard stream — broadcasts to WebSocket clients
        DeliverCallback dashboardCallback = (consumerTag, delivery) -> {
            try {
                EvaluatedEvent event = mapper.readValue(delivery.getBody(), EvaluatedEvent.class);
                windowAggregator.record(event);
            } catch (Exception e) {
                log.error("Failed to broadcast event to WebSocket", e);
            }
        };

        // Consumer 3: Alerts — logs critical fraud alerts for blocked transactions
        DeliverCallback alertsCallback = (consumerTag, delivery) -> {
            try {
                EvaluatedEvent event = mapper.readValue(delivery.getBody(), EvaluatedEvent.class);
                if ("BLOCKED".equals(event.getStatus())) {
                    log.warn("FRAUD ALERT — Transaction BLOCKED for user={}, reason={}, score={}, txId={}",
                            event.getUserId(), event.getRiskReason(), event.getRiskScore(),
                            event.getTransactionId());
                }
            } catch (Exception e) {
                log.error("Failed to process alert event", e);
            }
        };

        channel.basicConsume(SEARCH_QUEUE, true, searchCallback, consumerTag -> {
        });
        channel.basicConsume(DASHBOARD_QUEUE, true, dashboardCallback, consumerTag -> {
        });
        channel.basicConsume(ALERTS_QUEUE, true, alertsCallback, consumerTag -> {
        });

        log.info("RabbitMQ consumers started — listening on {}, {}, {}", SEARCH_QUEUE, DASHBOARD_QUEUE, ALERTS_QUEUE);
    }

    @Override
    public void stop() throws Exception {
        log.info("Shutting down RabbitMQ consumers");
        windowAggregator.stop();
        if (channel != null)
            channel.close();
        if (connection != null)
            connection.close();
    }

    private static class WindowAggregator {
        private final ObjectMapper mapper;
        private final RedisBackplaneService redisBackplaneService;
        private final java.util.concurrent.ScheduledExecutorService scheduler =
                java.util.concurrent.Executors.newSingleThreadScheduledExecutor(r -> {
                    Thread thread = new Thread(r, "dashboard-window-aggregator");
                    thread.setDaemon(true);
                    return thread;
                });

        private final java.util.concurrent.atomic.LongAdder totalProcessed = new java.util.concurrent.atomic.LongAdder();
        private final java.util.concurrent.atomic.LongAdder totalFailed = new java.util.concurrent.atomic.LongAdder();
        private final java.util.concurrent.ConcurrentLinkedQueue<Integer> latencies = new java.util.concurrent.ConcurrentLinkedQueue<>();
        private volatile long windowStartMillis = System.currentTimeMillis();

        WindowAggregator(ObjectMapper mapper, RedisBackplaneService redisBackplaneService) {
            this.mapper = mapper;
            this.redisBackplaneService = redisBackplaneService;
        }

        void start() {
            scheduler.scheduleAtFixedRate(this::flush, 1000, 1000, java.util.concurrent.TimeUnit.MILLISECONDS);
        }

        void record(EvaluatedEvent event) {
            totalProcessed.increment();
            if (!"APPROVED".equals(event.getStatus())) {
                totalFailed.increment();
            }
            long now = System.currentTimeMillis();
            int latency = (int) Math.max(0, now - event.getTimestamp());
            latencies.add(latency);
        }

        void flush() {
            try {
                long processed = totalProcessed.sumThenReset();
                long failed = totalFailed.sumThenReset();
                java.util.List<Integer> snapshot = new java.util.ArrayList<>();
                Integer value;
                while ((value = latencies.poll()) != null) {
                    snapshot.add(value);
                }

                if (processed == 0 && snapshot.isEmpty()) {
                    windowStartMillis = System.currentTimeMillis();
                    return;
                }

                java.util.Collections.sort(snapshot);
                ObjectNode payload = mapper.createObjectNode();
                payload.put("type", "telemetry.window");
                payload.put("windowStartMs", windowStartMillis);
                payload.put("windowEndMs", System.currentTimeMillis());
                payload.put("windowSizeMs", 1000);
                payload.put("processed", processed);
                payload.put("failed", failed);
                payload.put("p50LatencyMs", percentile(snapshot, 50));
                payload.put("p95LatencyMs", percentile(snapshot, 95));
                payload.put("p99LatencyMs", percentile(snapshot, 99));

                String message = mapper.writeValueAsString(payload);
                if (redisBackplaneService != null) {
                    redisBackplaneService.publish(message);
                } else {
                    FraudWebSocket.broadcast(message);
                }
                windowStartMillis = System.currentTimeMillis();
            } catch (Exception e) {
                LoggerFactory.getLogger(WindowAggregator.class)
                        .error("Failed to flush dashboard telemetry window", e);
            }
        }

        void stop() {
            scheduler.shutdownNow();
        }

        private int percentile(java.util.List<Integer> values, int percentile) {
            if (values.isEmpty()) {
                return 0;
            }
            int index = (int) Math.ceil((percentile / 100.0) * values.size()) - 1;
            return values.get(Math.max(0, Math.min(index, values.size() - 1)));
        }
    }
}
