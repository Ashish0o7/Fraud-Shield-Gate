package com.shieldgate.managed;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.*;
import com.shieldgate.api.EvaluatedEvent;
import com.shieldgate.core.ElasticsearchService;
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

    private static final String SEARCH_QUEUE = "search.queue";
    private static final String DASHBOARD_QUEUE = "dashboard.stream.queue";
    private static final String ALERTS_QUEUE = "alerts.queue";

    public RabbitMQConsumer(String host, int port, ObjectMapper mapper, ElasticsearchService elasticsearchService) {
        this.host = host;
        this.port = port;
        this.mapper = mapper;
        this.elasticsearchService = elasticsearchService;
    }

    @Override
    public void start() throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        connection = factory.newConnection();
        channel = connection.createChannel();

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
                String message = new String(delivery.getBody(), "UTF-8");
                FraudWebSocket.broadcast(message);
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
        if (channel != null)
            channel.close();
        if (connection != null)
            connection.close();
    }
}
