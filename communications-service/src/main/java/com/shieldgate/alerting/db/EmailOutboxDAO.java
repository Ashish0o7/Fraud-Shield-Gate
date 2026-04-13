package com.shieldgate.alerting.db;

import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.config.RegisterBeanMapper;
import org.jdbi.v3.sqlobject.statement.SqlQuery;
import org.jdbi.v3.sqlobject.statement.SqlUpdate;

import java.util.List;

@RegisterBeanMapper(EmailOutboxItem.class)
public interface EmailOutboxDAO {

    @SqlUpdate("CREATE TABLE IF NOT EXISTS email_outbox (" +
            "id BIGSERIAL PRIMARY KEY, " +
            "notification_id BIGINT NOT NULL REFERENCES notifications(id), " +
            "status VARCHAR(32) NOT NULL DEFAULT 'PENDING', " +
            "attempts INT NOT NULL DEFAULT 0, " +
            "next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(), " +
            "last_error TEXT, " +
            "created_at TIMESTAMP DEFAULT NOW(), " +
            "sent_at TIMESTAMP)")
    void createTable();

    @SqlUpdate("INSERT INTO email_outbox (notification_id, status) VALUES (:notificationId, 'PENDING')")
    void enqueue(@Bind("notificationId") long notificationId);

    @SqlQuery("SELECT id, notification_id AS notificationId FROM email_outbox " +
            "WHERE status IN ('PENDING', 'RETRY') AND next_attempt_at <= NOW() " +
            "ORDER BY created_at ASC LIMIT :limit")
    List<EmailOutboxItem> fetchReady(@Bind("limit") int limit);

    @SqlUpdate("UPDATE email_outbox SET status='SENT', sent_at=NOW(), last_error=NULL WHERE id=:id")
    void markSent(@Bind("id") long id);

    @SqlUpdate("UPDATE email_outbox SET status='RETRY', attempts=attempts+1, " +
            "next_attempt_at=NOW() + make_interval(secs => :delaySeconds), last_error=:error WHERE id=:id")
    void markRetry(@Bind("id") long id, @Bind("error") String error, @Bind("delaySeconds") int delaySeconds);

    @SqlUpdate("UPDATE email_outbox SET status='FAILED', attempts=attempts+1, last_error=:error WHERE id=:id")
    void markFailed(@Bind("id") long id, @Bind("error") String error);
}
