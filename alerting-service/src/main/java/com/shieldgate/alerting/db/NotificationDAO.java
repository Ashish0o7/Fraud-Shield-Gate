package com.shieldgate.alerting.db;

import com.shieldgate.alerting.api.Notification;
import org.jdbi.v3.sqlobject.config.RegisterBeanMapper;
import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.customizer.BindBean;
import org.jdbi.v3.sqlobject.statement.GetGeneratedKeys;
import org.jdbi.v3.sqlobject.statement.SqlQuery;
import org.jdbi.v3.sqlobject.statement.SqlUpdate;

import java.util.List;

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
            "created_at TIMESTAMP DEFAULT NOW())")
    void createTable();

    @SqlUpdate("INSERT INTO notifications (user_id, transaction_id, tx_user_id, status, risk_reason, " +
            "risk_score, amount, location, channel) " +
            "VALUES (:userId, :transactionId, :txUserId, :status, :riskReason, " +
            ":riskScore, :amount, :location, :channel)")
    @GetGeneratedKeys
    long insert(@BindBean Notification notification);

    @SqlQuery("SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC LIMIT 50")
    List<Notification> findByUserId(@Bind("userId") long userId);

    @SqlQuery("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50")
    List<Notification> findLatest();

    @SqlQuery("SELECT COUNT(*) FROM notifications WHERE user_id = :userId")
    long countByUserId(@Bind("userId") long userId);
}
