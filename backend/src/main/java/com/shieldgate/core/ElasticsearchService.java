package com.shieldgate.core;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.IndexRequest;
import co.elastic.clients.elasticsearch.indices.CreateIndexRequest;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import co.elastic.clients.json.JsonData;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shieldgate.api.EvaluatedEvent;
import io.dropwizard.lifecycle.Managed;
import org.apache.http.HttpHost;
import org.elasticsearch.client.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Manages the Elasticsearch connection and index lifecycle.
 *
 * Real-world practices applied here:
 * 1. Index is created with explicit mappings before any data is written.
 * This prevents ES from auto-mapping strings as `text` (tokenised) when
 * we need `keyword` (exact/wildcard) semantics.
 * 2. Document indexing is fire-and-forget on a dedicated thread pool so the
 * RabbitMQ consumer thread is never blocked by a network call to ES.
 */
public class ElasticsearchService implements Managed {
    private static final Logger log = LoggerFactory.getLogger(ElasticsearchService.class);

    public static final String INDEX_NAME = "transactions-stream";

    private final RestClient restClient;
    private final ElasticsearchTransport transport;
    private final ElasticsearchClient client;

    // Dedicated single-thread executor for async ES writes — decouples indexing
    // latency from the RabbitMQ consumer thread completely.
    private final ExecutorService indexExecutor = Executors.newFixedThreadPool(2);

    public ElasticsearchService(String host, int port, ObjectMapper mapper) {
        this.restClient = RestClient.builder(new HttpHost(host, port)).build();
        this.transport = new RestClientTransport(restClient, new JacksonJsonpMapper(mapper));
        this.client = new ElasticsearchClient(transport);
        log.info("Connected to Elasticsearch at {}:{}", host, port);
    }

    public ElasticsearchClient getClient() {
        return client;
    }

    /**
     * Indexes a transaction event asynchronously.
     * The caller (RabbitMQ consumer) is never blocked waiting for ES.
     * If indexing fails the error is logged — the transaction has already been
     * evaluated and persisted elsewhere, so this is acceptable.
     */
    public void indexEvent(EvaluatedEvent event) {
        CompletableFuture.runAsync(() -> {
            try {
                IndexRequest<EvaluatedEvent> request = IndexRequest.of(i -> i
                        .index(INDEX_NAME)
                        .id(event.getTransactionId().toString())
                        .document(event));
                client.index(request);
            } catch (Exception e) {
                log.error("Failed to index event txId={}: {}", event.getTransactionId(), e.getMessage());
            }
        }, indexExecutor);
    }

    /**
     * Creates the index with explicit field mappings if it does not already exist.
     *
     * Why this matters in production:
     * - Keyword fields: support exact match, wildcard, term aggregations.
     * - Text fields: full-text search (tokenised). Used only for riskReason.
     * - Numeric types: needed for range queries on amount / riskScore / timestamp.
     *
     * Without this, Elasticsearch auto-maps every new string as `text`,
     * which silently breaks wildcard queries and `.keyword` sub-field access.
     */
    private void ensureIndexWithMappings() {
        try {
            boolean exists = client.indices()
                    .exists(ExistsRequest.of(e -> e.index(INDEX_NAME)))
                    .value();

            if (exists) {
                log.info("Elasticsearch index '{}' already exists — skipping creation", INDEX_NAME);
                return;
            }

            client.indices().create(CreateIndexRequest.of(c -> c
                    .index(INDEX_NAME)
                    // Index settings: 1 shard is fine for a single-node dev setup.
                    // In production you'd set number_of_shards based on data volume.
                    .settings(s -> s
                            .numberOfShards("1")
                            .numberOfReplicas("0"))
                    .mappings(m -> m
                            // ── Identifiers (exact match + wildcard) ──────────────
                            .properties("transactionId", p -> p.keyword(k -> k))
                            .properties("userId", p -> p.keyword(k -> k))
                            // ── Categorical fields (exact match + wildcard) ────────
                            .properties("status", p -> p.keyword(k -> k))
                            .properties("merchantCategory", p -> p.keyword(k -> k))
                            .properties("location", p -> p.keyword(k -> k))
                            // ── Numeric fields (range queries) ─────────────────────
                            .properties("amount", p -> p.double_(d -> d))
                            .properties("riskScore", p -> p.integer(i -> i))
                            .properties("timestamp", p -> p.long_(l -> l))
                            // ── Free-text (full-text search, not wildcard) ─────────
                            .properties("riskReason", p -> p.text(t -> t)))));

            log.info("Created Elasticsearch index '{}' with explicit keyword/numeric mappings", INDEX_NAME);

        } catch (Exception e) {
            // Non-fatal: log and continue. The service still works; search may be degraded.
            log.error("Failed to create Elasticsearch index '{}': {}", INDEX_NAME, e.getMessage());
        }
    }

    /**
     * Pings Elasticsearch to verify connectivity.
     */
    public boolean isHealthy() {
        try {
            return client.ping().value();
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void start() {
        // Ensure the index exists with correct mappings before any writes happen.
        ensureIndexWithMappings();
    }

    @Override
    public void stop() throws IOException {
        log.info("Closing Elasticsearch connection");
        indexExecutor.shutdown();
        transport.close();
        restClient.close();
    }
}
