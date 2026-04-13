package com.shieldgate.core;

import io.dropwizard.lifecycle.Managed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPubSub;
import redis.clients.jedis.exceptions.JedisConnectionException;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

public class RedisBackplaneService implements Managed {
    private static final Logger log = LoggerFactory.getLogger(RedisBackplaneService.class);

    private final String host;
    private final int port;
    private final String channel;
    private final Consumer<String> messageHandler;
    private final ExecutorService subscriberExecutor = Executors.newSingleThreadExecutor();
    private JedisPool jedisPool;
    private JedisPubSub subscriber;

    public RedisBackplaneService(String host, int port, String channel, Consumer<String> messageHandler) {
        this.host = host;
        this.port = port;
        this.channel = channel;
        this.messageHandler = messageHandler;
    }

    @Override
    public void start() {
        jedisPool = new JedisPool(host, port);
        subscriber = new JedisPubSub() {
            @Override
            public void onMessage(String receivedChannel, String message) {
                if (!channel.equals(receivedChannel)) {
                    return;
                }
                messageHandler.accept(message);
            }
        };

        subscriberExecutor.submit(() -> {
            while (!Thread.currentThread().isInterrupted()) {
                try (Jedis jedis = jedisPool.getResource()) {
                    jedis.subscribe(subscriber, channel);
                } catch (JedisConnectionException e) {
                    log.warn("Redis backplane subscribe failed, retrying: {}", e.getMessage());
                    sleepQuietly();
                } catch (Exception e) {
                    log.error("Unexpected Redis subscriber failure", e);
                    sleepQuietly();
                }
            }
        });

        log.info("Redis backplane enabled on {}:{} channel={}", host, port, channel);
    }

    public void publish(String message) {
        if (jedisPool == null) {
            return;
        }
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.publish(channel, message);
        } catch (Exception e) {
            log.warn("Redis publish failed: {}", e.getMessage());
        }
    }

    @Override
    public void stop() {
        try {
            if (subscriber != null) {
                subscriber.unsubscribe();
            }
        } catch (Exception ignored) {
        }
        subscriberExecutor.shutdownNow();
        if (jedisPool != null) {
            jedisPool.close();
        }
    }

    private void sleepQuietly() {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
