package com.shieldgate.alerting.db;

import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.statement.SqlUpdate;

public interface ProcessedMessageDAO {

    @SqlUpdate("CREATE TABLE IF NOT EXISTS processed_messages (" +
            "consumer_name VARCHAR(128) NOT NULL, " +
            "event_id VARCHAR(255) NOT NULL, " +
            "processed_at TIMESTAMP DEFAULT NOW(), " +
            "PRIMARY KEY (consumer_name, event_id))")
    void createTable();

    @SqlUpdate("INSERT INTO processed_messages (consumer_name, event_id) VALUES (:consumerName, :eventId) " +
            "ON CONFLICT DO NOTHING")
    int tryInsert(@Bind("consumerName") String consumerName, @Bind("eventId") String eventId);
}
