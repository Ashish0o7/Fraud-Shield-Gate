package com.shieldgate.alerting.resources;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Proxies transaction submissions to the main ShieldGate backend.
 *
 * Changes from original:
 * - HttpClient configured with explicit connect + request timeouts (5 s each)
 * to avoid unbounded thread blocking if the backend is slow or down.
 * - sendAsync().get(timeout) instead of blocking send() — lets us terminate
 * the wait without leaking resources.
 */
@Path("/api/transactions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TransactionProxyResource {
    private static final Logger log = LoggerFactory.getLogger(TransactionProxyResource.class);

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final String backendUrl;
    private final HttpClient httpClient;

    public TransactionProxyResource(String backendUrl) {
        this.backendUrl = backendUrl;
        // Build once, reuse across all requests — HttpClient is thread-safe.
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .version(HttpClient.Version.HTTP_1_1)
                .build();
    }

    @POST
    @Path("/submit")
    public Response submitTransaction(String body) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(backendUrl + "/api/ingest"))
                    .header("Content-Type", "application/json")
                    .timeout(REQUEST_TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            // sendAsync + get(timeout) — avoids indefinite thread blocking
            HttpResponse<String> response = httpClient
                    .sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .get(10, TimeUnit.SECONDS);

            return Response.status(response.statusCode())
                    .entity(response.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();

        } catch (java.util.concurrent.TimeoutException e) {
            log.warn("Transaction proxy timed out after {}s", REQUEST_TIMEOUT.getSeconds());
            return Response.status(504)
                    .entity(Map.of("error", "Backend timeout — please retry"))
                    .build();
        } catch (Exception e) {
            log.error("Failed to proxy transaction: {}", e.getMessage());
            return Response.serverError()
                    .entity(Map.of("error", "Failed to reach ShieldGate backend", "detail", e.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/flood")
    public Response flood(@QueryParam("count") @DefaultValue("50") int count) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(backendUrl + "/api/demo/flood?count=" + count))
                    .header("Content-Type", "application/json")
                    .timeout(REQUEST_TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<String> response = httpClient
                    .sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .get(10, TimeUnit.SECONDS);

            return Response.status(response.statusCode())
                    .entity(response.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();

        } catch (Exception e) {
            log.error("Failed to proxy flood: {}", e.getMessage());
            return Response.serverError()
                    .entity(Map.of("error", "Failed to reach ShieldGate backend"))
                    .build();
        }
    }
}
