package com.shieldgate.alerting.db;

import com.shieldgate.alerting.api.Notification;
import com.shieldgate.alerting.api.RecipientMetrics;
import org.jdbi.v3.sqlobject.config.RegisterBeanMapper;
import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.customizer.BindBean;
import org.jdbi.v3.sqlobject.statement.GetGeneratedKeys;
import org.jdbi.v3.sqlobject.statement.SqlQuery;
import org.jdbi.v3.sqlobject.statement.SqlUpdate;

import java.util.List;
import java.util.Optional;

@RegisterBeanMapper(Notification.class)
public interface NotificationDAO {

    @SqlUpdate("CREATE TABLE IF NOT EXISTS notifications (" +
            "id BIGSERIAL PRIMARY KEY, " +
            "user_id BIGINT NOT NULL REFERENCES users(id), " +
            "transaction_id VARCHAR(255) NOT NULL, " +
            "tx_user_id VARCHAR(255), " +
            "status VARCHAR(50) NOT NULL, " +
            "risk_reason TEXT, " +
            "risk_score INT, " +
            "amount DOUBLE PRECISION, " +
            "location VARCHAR(255), " +
            "channel VARCHAR(50) DEFAULT 'IN_APP', " +
            "delivery_status VARCHAR(32) DEFAULT 'PENDING', " +
            "delivery_error TEXT, " +
            "delivered_at TIMESTAMP, " +
            "created_at TIMESTAMP DEFAULT NOW())")
    void createTable();

    @SqlUpdate("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(32) DEFAULT 'PENDING'; " +
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_error TEXT; " +
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP")
    void migrateSchema();

    @SqlUpdate("INSERT INTO notifications (user_id, transaction_id, tx_user_id, status, risk_reason, " +
            "risk_score, amount, location, channel, delivery_status, delivery_error, delivered_at) " +
            "VALUES (:userId, :transactionId, :txUserId, :status, :riskReason, " +
            ":riskScore, :amount, :location, :channel, :deliveryStatus, :deliveryError, :deliveredAt)")
    @GetGeneratedKeys
    long insert(@BindBean Notification notification);

    @SqlUpdate("UPDATE notifications SET delivery_status = :deliveryStatus, delivery_error = :deliveryError, " +
            "delivered_at = CASE WHEN :delivered THEN NOW() ELSE NULL END WHERE id = :id")
    void updateDeliveryStatus(@Bind("id") long id,
            @Bind("deliveryStatus") String deliveryStatus,
            @Bind("deliveryError") String deliveryError,
            @Bind("delivered") boolean delivered);

    @SqlQuery("SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50")
    List<Notification> findByUserId(@Bind("userId") long userId);

    @SqlQuery("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50")
    List<Notification> findLatest();

    @SqlQuery("SELECT * FROM notifications WHERE id = :id")
    Optional<Notification> findById(@Bind("id") long id);

    @SqlQuery("SELECT COUNT(*) FROM notifications WHERE user_id = :userId")
    long countByUserId(@Bind("userId") long userId);

    @RegisterBeanMapper(RecipientMetrics.class)
    @SqlQuery("SELECT u.user_id AS recipient_id, u.name AS recipient_name, u.email AS recipient_email, " +
            "COUNT(n.id) AS total_notifications, " +
            "COUNT(*) FILTER (WHERE n.delivery_status = 'DELIVERED') AS delivered_count, " +
            "COUNT(*) FILTER (WHERE n.delivery_status = 'FAILED') AS failed_count, " +
            "COUNT(*) FILTER (WHERE n.status = 'BLOCKED') AS blocked_count, " +
            "COUNT(*) FILTER (WHERE n.status = 'FLAGGED') AS flagged_count, " +
            "MAX(n.created_at)::text AS last_sent_at " +
            "FROM users u " +
            "LEFT JOIN notifications n ON n.user_id = u.id " +
            "AND n.created_at >= NOW() - make_interval(hours => :hours) " +
            "GROUP BY u.user_id, u.name, u.email " +
            "ORDER BY delivered_count DESC, total_notifications DESC")
    List<RecipientMetrics> recipientMetrics(@Bind("hours") int hours);
}
