package com.shieldgate.alerting.managed;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.*;
import com.shieldgate.alerting.core.NotificationService;
import io.dropwizard.lifecycle.Managed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * RabbitMQ consumer that listens on notifications.queue for fraud events.
 * When a BLOCKED or FLAGGED transaction arrives, delegates to
 * NotificationService.
 */
public class NotificationConsumer implements Managed {
    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    private static final String EXCHANGE_NAME = "tx.fanout";
    private static final String QUEUE_NAME = "notifications.queue";

    private final String host;
    private final int port;
    private final ObjectMapper mapper;
    private final NotificationService notificationService;
    private Connection connection;
    private Channel channel;

    public NotificationConsumer(String host, int port, ObjectMapper mapper,
            NotificationService notificationService) {
        this.host = host;
        this.port = port;
        this.mapper = mapper;
        this.notificationService = notificationService;
    }

    @Override
    public void start() throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        connection = factory.newConnection();
        channel = connection.createChannel();

        // Declare and bind the notifications queue to the fanout exchange
        channel.exchangeDeclare(EXCHANGE_NAME, "fanout", true);
        channel.queueDeclare(QUEUE_NAME, true, false, false, null);
        channel.queueBind(QUEUE_NAME, EXCHANGE_NAME, "");

        DeliverCallback callback = (consumerTag, delivery) -> {
            try {
                Map<String, Object> event = mapper.readValue(
                        delivery.getBody(), new TypeReference<Map<String, Object>>() {
                        });
                notificationService.processEvent(event);
            } catch (Exception e) {
                log.error("Failed to process notification event", e);
            }
        };

        channel.basicConsume(QUEUE_NAME, true, callback, consumerTag -> {
        });

        log.info("Notification consumer started — listening on {}", QUEUE_NAME);
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
