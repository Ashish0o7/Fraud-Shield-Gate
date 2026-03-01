package com.shieldgate.core;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.shieldgate.api.EvaluatedEvent;
import io.dropwizard.lifecycle.Managed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.concurrent.TimeoutException;

public class RabbitMQService implements Managed {
    private static final Logger log = LoggerFactory.getLogger(RabbitMQService.class);

    private final Connection connection;
    private final ObjectMapper mapper;

    public static final String EXCHANGE_NAME = "tx.fanout";
    public static final String ROUTING_KEY = "";

    /**
     * ThreadLocal channel pool — RabbitMQ channels are NOT thread-safe.
     * Each thread gets its own channel to prevent frame interleaving
     * when publishing concurrently from the 50-thread executor pool.
     * Initialized lazily so `connection` is guaranteed to be set before first use.
     */
    private final ThreadLocal<Channel> channelPool;

    public RabbitMQService(String host, int port, ObjectMapper mapper) throws IOException, TimeoutException {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        this.connection = factory.newConnection();
        this.mapper = mapper;

        // ThreadLocal must be created AFTER connection is initialized
        this.channelPool = ThreadLocal.withInitial(() -> {
            try {
                Channel ch = connection.createChannel();
                ch.exchangeDeclare(EXCHANGE_NAME, "fanout", true);
                return ch;
            } catch (IOException e) {
                throw new RuntimeException("Failed to create RabbitMQ channel", e);
            }
        });

        // Declare exchange on a temporary channel to ensure it exists
        try (Channel setupChannel = connection.createChannel()) {
            setupChannel.exchangeDeclare(EXCHANGE_NAME, "fanout", true);
        }

        log.info("Connected to RabbitMQ at {}:{}", host, port);
    }

    public void publishEvent(EvaluatedEvent event) {
        try {
            byte[] body = mapper.writeValueAsBytes(event);
            channelPool.get().basicPublish(EXCHANGE_NAME, ROUTING_KEY, null, body);
        } catch (IOException e) {
            log.error("Failed to publish event to RabbitMQ: txId={}", event.getTransactionId(), e);
        }
    }

    public boolean isConnected() {
        return connection != null && connection.isOpen();
    }

    @Override
    public void start() {
        // Connection already established in constructor
    }

    @Override
    public void stop() throws IOException {
        log.info("Closing RabbitMQ connection");
        connection.close();
    }
}
