package com.shieldgate.resources;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.CountResponse;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.aggregations.StringTermsBucket;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.json.JsonData;
import com.shieldgate.api.EvaluatedEvent;
import com.shieldgate.core.ElasticsearchService;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Path("/api/audit")
@Produces(MediaType.APPLICATION_JSON)
public class AuditResource {

    private final ElasticsearchService esService;

    public AuditResource(ElasticsearchService esService) {
        this.esService = esService;
    }

    // ── Search ─────────────────────────────────────────────────────────────────
    @GET
    @Path("/search")
    public List<EvaluatedEvent> search(
            @QueryParam("q") String query,
            @QueryParam("status") String status,
            @QueryParam("category") String category,
            @QueryParam("minAmount") Double minAmount,
            @QueryParam("maxAmount") Double maxAmount) {
        try {
            ElasticsearchClient client = esService.getClient();
            SearchResponse<EvaluatedEvent> response = client.search(s -> s
                    .index(ElasticsearchService.INDEX_NAME)
                    .query(q -> q.bool(b -> {
                        if (query != null && !query.isBlank()) {
                            String wc = "*" + query.toLowerCase() + "*";
                            b.should(sh -> sh.wildcard(w -> w.field("userId").wildcard(wc).caseInsensitive(true)));
                            b.should(sh -> sh
                                    .wildcard(w -> w.field("merchantCategory").wildcard(wc).caseInsensitive(true)));
                            b.should(sh -> sh.wildcard(w -> w.field("location").wildcard(wc).caseInsensitive(true)));
                            b.should(sh -> sh.wildcard(w -> w.field("status").wildcard(wc).caseInsensitive(true)));
                            b.should(sh -> sh.term(t -> t.field("transactionId").value(query)));
                            b.should(sh -> sh.match(m -> m.field("riskReason").query(query)));
                            try {
                                double amt = Double.parseDouble(query);
                                b.should(sh -> sh.term(t -> t.field("amount").value(amt)));
                            } catch (NumberFormatException ignored) {
                            }
                            b.minimumShouldMatch("1");
                        }
                        if (status != null && !status.isBlank())
                            b.filter(f -> f.term(t -> t.field("status").value(status.toUpperCase())));
                        if (category != null && !category.isBlank())
                            b.filter(f -> f.term(t -> t.field("merchantCategory").value(category.toUpperCase())));
                        if (minAmount != null || maxAmount != null) {
                            b.filter(f -> f.range(r -> {
                                r.field("amount");
                                if (minAmount != null)
                                    r.gte(JsonData.of(minAmount));
                                if (maxAmount != null)
                                    r.lte(JsonData.of(maxAmount));
                                return r;
                            }));
                        }
                        return b;
                    }))
                    .sort(so -> so.field(f -> f.field("timestamp").order(SortOrder.Desc)))
                    .size(200), EvaluatedEvent.class);

            List<EvaluatedEvent> events = response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .collect(Collectors.toList());

            return events;
        } catch (Exception e) {
            return List.of();
        }
    }

    // ── Latest ─────────────────────────────────────────────────────────────────
    @GET
    @Path("/latest")
    public List<EvaluatedEvent> latest() {
        try {
            ElasticsearchClient client = esService.getClient();
            SearchResponse<EvaluatedEvent> response = client.search(s -> s
                    .index(ElasticsearchService.INDEX_NAME)
                    .sort(so -> so.field(f -> f.field("timestamp").order(SortOrder.Desc)))
                    .size(15), EvaluatedEvent.class);

            List<EvaluatedEvent> events = response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .collect(Collectors.toList());

            return events;
        } catch (Exception e) {
            return List.of();
        }
    }

    // ── Stats ──────────────────────────────────────────────────────────────────
    @GET
    @Path("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> result = new HashMap<>();
        try {
            ElasticsearchClient client = esService.getClient();

            CountResponse countResp = client.count(c -> c.index(ElasticsearchService.INDEX_NAME));
            long totalStats = countResp.count();

            long sixtySecsAgo = System.currentTimeMillis() - 60000;

            SearchResponse<Void> aggResponse = client.search(s -> s
                    .index(ElasticsearchService.INDEX_NAME)
                    .size(0)
                    .query(q -> q.range(r -> r.field("timestamp").gte(JsonData.of(sixtySecsAgo))))
                    .aggregations("by_status", a -> a.terms(t -> t.field("status"))), Void.class);

            Map<String, Long> last60sBreakdown = new HashMap<>();
            if (aggResponse.aggregations().get("by_status") != null) {
                List<StringTermsBucket> buckets = aggResponse.aggregations()
                        .get("by_status").sterms().buckets().array();
                for (StringTermsBucket bucket : buckets) {
                    last60sBreakdown.put(bucket.key().stringValue(), bucket.docCount());
                }
            }

            result.put("totalOverall", totalStats);
            result.put("recentBreakdown", last60sBreakdown);
        } catch (Exception e) {
            result.put("totalOverall", 0);
            result.put("recentBreakdown", new HashMap<>());
        }
        return result;
    }

}
