package com.shieldgate.alerting.db;

import com.shieldgate.alerting.api.User;
import org.jdbi.v3.sqlobject.config.RegisterBeanMapper;
import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.customizer.BindBean;
import org.jdbi.v3.sqlobject.statement.GetGeneratedKeys;
import org.jdbi.v3.sqlobject.statement.SqlQuery;
import org.jdbi.v3.sqlobject.statement.SqlUpdate;

import java.util.List;
import java.util.Optional;

@RegisterBeanMapper(User.class)
public interface UserDAO {

        /**
         * Creates the users table with a human-readable, externally-visible `user_id`
         * (e.g. "usr_a3f9b2c1") separate from the internal auto-increment PK.
         * The `user_id` is what flows through transactions and the fraud pipeline.
         */
        @SqlUpdate("CREATE TABLE IF NOT EXISTS users (" +
                        "id BIGSERIAL PRIMARY KEY, " +
                        "user_id VARCHAR(32) UNIQUE NOT NULL, " +
                        "email VARCHAR(255) UNIQUE NOT NULL, " +
                        "name VARCHAR(255) NOT NULL, " +
                        "location VARCHAR(255), " +
                        "password_hash VARCHAR(255) NOT NULL, " +
                        "notify_blocked BOOLEAN DEFAULT TRUE, " +
                        "notify_flagged BOOLEAN DEFAULT FALSE, " +
                        "created_at TIMESTAMP DEFAULT NOW())")
        void createTable();

        @SqlUpdate("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id VARCHAR(32) UNIQUE; " +
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)")
        void migrateSchema();

        /**
         * Back-fills any existing rows that are missing a user_id.
         * Uses the same prefix + 8-char hex pattern for consistency.
         */
        @SqlUpdate("UPDATE users SET user_id = 'usr_' || SUBSTRING(MD5(id::text), 1, 8) " +
                        "WHERE user_id IS NULL")
        void backfillUserIds();

        @SqlUpdate("INSERT INTO users (user_id, email, name, location, password_hash, notify_blocked, notify_flagged) "
                        +
                        "VALUES (:userId, :email, :name, :location, :passwordHash, :notifyBlocked, :notifyFlagged)")
        @GetGeneratedKeys
        long insert(@BindBean User user);

        @SqlQuery("SELECT * FROM users WHERE id = :id")
        Optional<User> findById(@Bind("id") long id);

        @SqlQuery("SELECT * FROM users WHERE user_id = :userId")
        Optional<User> findByUserId(@Bind("userId") String userId);

        @SqlQuery("SELECT * FROM users WHERE email = :email")
        Optional<User> findByEmail(@Bind("email") String email);

        @SqlQuery("SELECT * FROM users ORDER BY id")
        List<User> findAll();

        @SqlUpdate("UPDATE users SET notify_blocked = :notifyBlocked, notify_flagged = :notifyFlagged WHERE id = :id")
        void updatePreferences(@Bind("id") long id,
                        @Bind("notifyBlocked") boolean notifyBlocked,
                        @Bind("notifyFlagged") boolean notifyFlagged);

        @SqlQuery("SELECT * FROM users WHERE " +
                        "(notify_blocked = true AND :status = 'BLOCKED') OR " +
                        "(notify_flagged = true AND :status = 'FLAGGED')")
        List<User> findUsersToNotify(@Bind("status") String status);
}
