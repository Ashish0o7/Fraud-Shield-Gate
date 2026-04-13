package com.shieldgate.alerting.core;

import com.shieldgate.alerting.api.Notification;
import com.shieldgate.alerting.api.RecipientMetrics;
import com.shieldgate.alerting.api.User;
import com.shieldgate.alerting.AlertingConfiguration;
import com.shieldgate.alerting.db.NotificationDAO;
import com.shieldgate.alerting.db.UserDAO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for NotificationService.
 * Uses simple stub implementations of DAOs instead of mocking frameworks
 * to keep dependencies minimal and test logic transparent.
 */
class NotificationServiceTest {

    private StubUserDAO userDAO;
    private StubNotificationDAO notificationDAO;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        userDAO = new StubUserDAO();
        notificationDAO = new StubNotificationDAO();
        AlertingConfiguration.EmailConfiguration emailConfiguration = new AlertingConfiguration.EmailConfiguration();
        emailConfiguration.setDemoMode(true);
        service = new NotificationService(userDAO, notificationDAO, emailConfiguration);
    }

    @Test
    @DisplayName("BLOCKED event creates notification for users with notifyBlocked=true")
    void blockedEventNotifies() {
        User user = createUser(1, "admin@test.com", true, false);
        userDAO.addUser(user);

        Map<String, Object> event = createEvent("BLOCKED", "tx-001", "user-42", 50000, 85);
        service.processEvent(event);

        assertEquals(1, notificationDAO.insertedNotifications.size(),
                "Should create one notification");
        Notification n = notificationDAO.insertedNotifications.get(0);
        assertEquals("BLOCKED", n.getStatus());
        assertEquals("tx-001", n.getTransactionId());
        assertEquals(85, n.getRiskScore());
    }

    @Test
    @DisplayName("FLAGGED event creates notification for users with notifyFlagged=true")
    void flaggedEventNotifies() {
        User user = createUser(1, "analyst@test.com", false, true);
        userDAO.addUser(user);

        service.processEvent(createEvent("FLAGGED", "tx-002", "user-99", 30000, 60));

        assertEquals(1, notificationDAO.insertedNotifications.size());
        assertEquals("FLAGGED", notificationDAO.insertedNotifications.get(0).getStatus());
    }

    @Test
    @DisplayName("APPROVED event does NOT create any notification")
    void approvedEventSkipped() {
        User user = createUser(1, "admin@test.com", true, true);
        userDAO.addUser(user);

        service.processEvent(createEvent("APPROVED", "tx-003", "user-1", 1000, 10));

        assertTrue(notificationDAO.insertedNotifications.isEmpty(),
                "APPROVED events should not generate notifications");
    }

    @Test
    @DisplayName("No notifications when no users have matching preferences")
    void noMatchingUsers() {
        // User only wants BLOCKED notifications
        User user = createUser(1, "admin@test.com", true, false);
        userDAO.addUser(user);

        // Send a FLAGGED event — user doesn't want FLAGGED notifications
        service.processEvent(createEvent("FLAGGED", "tx-004", "user-1", 5000, 55));

        assertTrue(notificationDAO.insertedNotifications.isEmpty(),
                "Should not notify when user preferences don't match");
    }

    @Test
    @DisplayName("Multiple users receive notifications for the same event")
    void multipleUsersNotified() {
        userDAO.addUser(createUser(1, "admin@test.com", true, false));
        userDAO.addUser(createUser(2, "security@test.com", true, true));
        userDAO.addUser(createUser(3, "analyst@test.com", true, false));

        service.processEvent(createEvent("BLOCKED", "tx-005", "user-1", 200000, 95));

        assertEquals(3, notificationDAO.insertedNotifications.size(),
                "All 3 users with notifyBlocked=true should be notified");
    }

    @Test
    @DisplayName("Registered transaction owner is notified first when preferences allow")
    void ownerPreferredOverGlobalRecipients() {
        userDAO.addUser(createUser(1, "owner@test.com", true, true));
        userDAO.addUser(createUser(2, "team@test.com", true, true));

        service.processEvent(createEvent("BLOCKED", "tx-006", "usr_1", 150000, 91));

        assertEquals(1, notificationDAO.insertedNotifications.size(),
                "Owner should receive a direct notification without blasting all recipients");
        assertEquals(1, notificationDAO.insertedNotifications.get(0).getUserId());
    }

    // ── Helpers ──

    private User createUser(long id, String email, boolean notifyBlocked, boolean notifyFlagged) {
        User user = new User();
        user.setId(id);
        user.setUserId("usr_" + id);
        user.setEmail(email);
        user.setName("Test User " + id);
        user.setNotifyBlocked(notifyBlocked);
        user.setNotifyFlagged(notifyFlagged);
        return user;
    }

    private Map<String, Object> createEvent(String status, String txId, String userId,
            double amount, int riskScore) {
        Map<String, Object> event = new HashMap<>();
        event.put("status", status);
        event.put("transactionId", txId);
        event.put("userId", userId);
        event.put("amount", amount);
        event.put("riskScore", riskScore);
        event.put("riskReason", "Test reason");
        event.put("location", "Mumbai");
        return event;
    }

    // ── Stub DAOs (simple in-memory implementations for testing) ──

    static class StubUserDAO implements UserDAO {
        private final List<User> users = new ArrayList<>();

        void addUser(User user) {
            users.add(user);
        }

        @Override
        public void createTable() {
        }

        @Override
        public void migrateSchema() {
        }

        @Override
        public void backfillUserIds() {
        }

        @Override
        public long insert(User user) {
            users.add(user);
            return users.size();
        }

        @Override
        public Optional<User> findById(long id) {
            return users.stream().filter(u -> u.getId() == id).findFirst();
        }

        @Override
        public Optional<User> findByUserId(String userId) {
            return users.stream().filter(u -> userId.equals(u.getUserId())).findFirst();
        }

        @Override
        public Optional<User> findByEmail(String email) {
            return users.stream().filter(u -> email.equals(u.getEmail())).findFirst();
        }

        @Override
        public List<User> findAll() {
            return users;
        }

        @Override
        public void updatePreferences(long id, boolean nb, boolean nf) {
        }

        @Override
        public List<User> findUsersToNotify(String status) {
            return users.stream().filter(u -> {
                if ("BLOCKED".equals(status))
                    return u.isNotifyBlocked();
                if ("FLAGGED".equals(status))
                    return u.isNotifyFlagged();
                return false;
            }).toList();
        }
    }

    static class StubNotificationDAO implements NotificationDAO {
        final List<Notification> insertedNotifications = new ArrayList<>();

        @Override
        public void createTable() {
        }

        @Override
        public void migrateSchema() {
        }

        @Override
        public long insert(Notification n) {
            insertedNotifications.add(n);
            return insertedNotifications.size();
        }

        @Override
        public void updateDeliveryStatus(long id, String deliveryStatus, String deliveryError, boolean delivered) {
        }

        @Override
        public List<Notification> findByUserId(long userId) {
            return List.of();
        }

        @Override
        public List<Notification> findLatest() {
            return List.of();
        }

        @Override
        public Optional<Notification> findById(long id) {
            if (id <= 0 || id > insertedNotifications.size()) {
                return Optional.empty();
            }
            return Optional.of(insertedNotifications.get((int) id - 1));
        }

        @Override
        public long countByUserId(long userId) {
            return 0;
        }

        @Override
        public List<RecipientMetrics> recipientMetrics(int hours) {
            return List.of();
        }
    }
}
