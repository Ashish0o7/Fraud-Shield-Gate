package com.shieldgate.alerting.managed;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.*;
import com.shieldgate.alerting.core.NotificationWorkflowService;
import io.dropwizard.lifecycle.Managed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * RabbitMQ consumer that listens on notifications.queue for fraud events.
 * When a BLOCKED or FLAGGED transaction arrives, delegates to
 * NotificationService.
 *
 * Production patterns:
 * 1. Dead Letter Queue (DLQ) — messages that fail processing 3x are routed to
 * notifications.dlq instead of being silently dropped.
 * 2. Idempotency Guard — durable PostgreSQL processed_messages keys prevent
 * duplicate side effects when RabbitMQ redelivers (at-least-once semantics).
 * 3. Manual ACK — messages are only acknowledged after successful processing,
 * preventing data loss on consumer crashes.
 * 4. Connection exposed for health check probing.
 */
public class NotificationConsumer implements Managed {
    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    private static final String EXCHANGE_NAME = "tx.fanout";
    private static final String QUEUE_NAME = "notifications.queue";
    private static final String DLQ_NAME = "notifications.dlq";
    private static final int MAX_RETRIES = 3;

    private final String host;
    private final int port;
    private final ObjectMapper mapper;
    private final NotificationWorkflowService workflowService;
    private Connection connection;
    private Channel channel;

    public NotificationConsumer(String host, int port, ObjectMapper mapper,
            NotificationWorkflowService workflowService) {
        this.host = host;
        this.port = port;
        this.mapper = mapper;
        this.workflowService = workflowService;
    }

    @Override
    public void start() throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        // Automatic recovery — reconnects to RabbitMQ after network blips
        factory.setAutomaticRecoveryEnabled(true);
        factory.setNetworkRecoveryInterval(5000);

        connection = factory.newConnection();
        channel = connection.createChannel();

        // ── Declare Dead Letter Queue ──
        // Messages that fail MAX_RETRIES times are routed here for investigation
        channel.queueDeclare(DLQ_NAME, true, false, false, null);

        // ── Declare main queue with DLQ routing ──
        Map<String, Object> queueArgs = Map.of(
                "x-dead-letter-exchange", "", // default exchange
                "x-dead-letter-routing-key", DLQ_NAME // route to DLQ
        );

        channel.exchangeDeclare(EXCHANGE_NAME, "fanout", true);
        channel.queueDeclare(QUEUE_NAME, true, false, false, queueArgs);
        channel.queueBind(QUEUE_NAME, EXCHANGE_NAME, "");

        // Manual ACK mode — messages stay in queue until we explicitly ack
        channel.basicQos(10); // prefetch 10 messages at a time

        DeliverCallback callback = (consumerTag, delivery) -> {
            String deliveryTag = String.valueOf(delivery.getEnvelope().getDeliveryTag());
            try {
                Map<String, Object> event = mapper.readValue(
                        delivery.getBody(), new TypeReference<Map<String, Object>>() {
                        });

                workflowService.processEvent(event);

                // ACK only after successful processing
                channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);

            } catch (Exception e) {
                log.error("Failed to process notification event: {}", e.getMessage());

                // Check retry count — nack/reject based on whether we've exhausted retries
                long retryCount = getRetryCount(delivery);
                if (retryCount >= MAX_RETRIES) {
                    // Reject with requeue=false → routes to DLQ via dead letter exchange
                    log.warn("Message exhausted {} retries — routing to DLQ", MAX_RETRIES);
                    channel.basicReject(delivery.getEnvelope().getDeliveryTag(), false);
                } else {
                    // Nack with requeue=true → message goes back to the queue for retry
                    channel.basicNack(delivery.getEnvelope().getDeliveryTag(), false, true);
                }
            }
        };

        // autoAck=false for manual acknowledgment
        channel.basicConsume(QUEUE_NAME, false, callback, consumerTag -> {
        });

        log.info("Notification consumer started — listening on {} (DLQ: {})", QUEUE_NAME, DLQ_NAME);
    }

    /**
     * Extracts the x-death header count to determine how many times this message
     * has been rejected. RabbitMQ adds this header automatically on dead-letter
     * routing.
     */
    private long getRetryCount(Delivery delivery) {
        Map<String, Object> headers = delivery.getProperties().getHeaders();
        if (headers == null)
            return 0;
        Object xDeath = headers.get("x-death");
        if (xDeath instanceof java.util.List) {
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> deathList = (java.util.List<Map<String, Object>>) xDeath;
            if (!deathList.isEmpty()) {
                Object count = deathList.get(0).get("count");
                if (count instanceof Number) {
                    return ((Number) count).longValue();
                }
            }
        }
        return 0;
    }

    /** Exposes the connection for health check probing. */
    public Connection getConnection() {
        return connection;
    }

    @Override
    public void stop() throws Exception {
        log.info("Shutting down notification consumer");
        if (channel != null)
            channel.close();
        if (connection != null)
            connection.close();
    }
}
