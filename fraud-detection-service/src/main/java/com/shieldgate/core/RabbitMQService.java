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
import java.util.concurrent.TimeUnit;

public class RabbitMQService implements Managed {
    private static final Logger log = LoggerFactory.getLogger(RabbitMQService.class);

    private final Connection connection;
    private final ObjectMapper mapper;

    public static final String EXCHANGE_NAME = "tx.fanout";
    public static final String ROUTING_KEY = "";
    private final int publishMaxRetries;

    /**
     * ThreadLocal channel pool — RabbitMQ channels are NOT thread-safe.
     * Each thread gets its own channel to prevent frame interleaving
     * when publishing concurrently from the 50-thread executor pool.
     * Initialized lazily so `connection` is guaranteed to be set before first use.
     */
    private final ThreadLocal<Channel> channelPool;

    public RabbitMQService(String host, int port, ObjectMapper mapper, int publishMaxRetries) throws IOException, TimeoutException {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        this.connection = factory.newConnection();
        this.mapper = mapper;
        this.publishMaxRetries = Math.max(1, publishMaxRetries);

        // ThreadLocal must be created AFTER connection is initialized
        this.channelPool = ThreadLocal.withInitial(() -> {
            try {
                Channel ch = connection.createChannel();
                ch.exchangeDeclare(EXCHANGE_NAME, "fanout", true);
                ch.confirmSelect();
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
        publishEventReliably(event);
    }

    public boolean publishEventReliably(EvaluatedEvent event) {
        try {
            byte[] body = mapper.writeValueAsBytes(event);
            for (int attempt = 1; attempt <= publishMaxRetries; attempt++) {
                Channel channel = channelPool.get();
                channel.basicPublish(EXCHANGE_NAME, ROUTING_KEY, null, body);
                if (channel.waitForConfirms(5000)) {
                    return true;
                }
                log.warn("RabbitMQ publish not confirmed for txId={} on attempt {}/{}",
                        event.getTransactionId(), attempt, publishMaxRetries);
                TimeUnit.MILLISECONDS.sleep(Math.min(200L * attempt, 1000L));
            }
            log.error("Failed to publish event after retries: txId={}", event.getTransactionId());
            return false;
        } catch (IOException e) {
            log.error("Failed to publish event to RabbitMQ: txId={}", event.getTransactionId(), e);
            return false;
        } catch (TimeoutException e) {
            log.error("Timed out waiting for RabbitMQ confirms: txId={}", event.getTransactionId());
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while waiting for RabbitMQ confirms: txId={}", event.getTransactionId());
            return false;
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
