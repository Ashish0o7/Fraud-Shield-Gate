package com.shieldgate.alerting.core;

import com.shieldgate.alerting.api.Notification;
import com.shieldgate.alerting.api.User;
import com.shieldgate.alerting.db.EmailOutboxDAO;
import com.shieldgate.alerting.db.NotificationDAO;
import com.shieldgate.alerting.db.ProcessedMessageDAO;
import com.shieldgate.alerting.db.UserDAO;
import org.jdbi.v3.core.Jdbi;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

public class NotificationWorkflowService {
    private static final Logger log = LoggerFactory.getLogger(NotificationWorkflowService.class);
    private static final String CONSUMER_NAME = "notifications-consumer";

    private final Jdbi jdbi;
    private final NotificationService notificationService;

    public NotificationWorkflowService(Jdbi jdbi, NotificationService notificationService) {
        this.jdbi = jdbi;
        this.notificationService = notificationService;
    }

    public void processEvent(Map<String, Object> event) {
        String status = String.valueOf(event.get("status"));
        if (!"BLOCKED".equals(status) && !"FLAGGED".equals(status)) {
            return;
        }

        String eventId = getEventId(event);
        String transactionId = String.valueOf(event.get("transactionId"));
        String txUserId = getAsString(event.get("userId"));
        String riskReason = getAsString(event.get("riskReason"));
        int riskScore = getAsInt(event.get("riskScore"));
        double amount = getAsDouble(event.get("amount"));
        String location = getAsString(event.get("location"));

        jdbi.useTransaction(handle -> {
            ProcessedMessageDAO processedDAO = handle.attach(ProcessedMessageDAO.class);
            NotificationDAO notificationDAO = handle.attach(NotificationDAO.class);
            UserDAO userDAO = handle.attach(UserDAO.class);
            EmailOutboxDAO outboxDAO = handle.attach(EmailOutboxDAO.class);

            int inserted = processedDAO.tryInsert(CONSUMER_NAME, eventId);
            if (inserted == 0) {
                log.debug("Skipping duplicate eventId={}", eventId);
                return;
            }

            List<User> usersToNotify = resolveRecipients(userDAO, status, txUserId);
            for (User user : usersToNotify) {
                Notification notification = new Notification();
                notification.setUserId(user.getId());
                notification.setTransactionId(transactionId);
                notification.setTxUserId(txUserId);
                notification.setStatus(status);
                notification.setRiskReason(riskReason);
                notification.setRiskScore(riskScore);
                notification.setAmount(amount);
                notification.setLocation(location);
                notification.setChannel("EMAIL");
                notification.setDeliveryStatus("PENDING");

                long notificationId = notificationDAO.insert(notification);
                outboxDAO.enqueue(notificationId);
            }
        });
    }

    public NotificationService getNotificationService() {
        return notificationService;
    }

    private List<User> resolveRecipients(UserDAO userDAO, String status, String txUserId) {
        if (txUserId != null && !txUserId.isBlank()) {
            var owner = userDAO.findByUserId(txUserId);
            if (owner.isPresent()) {
                if ("BLOCKED".equals(status) && owner.get().isNotifyBlocked()) {
                    return List.of(owner.get());
                }
                if ("FLAGGED".equals(status) && owner.get().isNotifyFlagged()) {
                    return List.of(owner.get());
                }
            }
        }
        return userDAO.findUsersToNotify(status);
    }

    private String getEventId(Map<String, Object> event) {
        Object eventId = event.get("eventId");
        if (eventId == null || String.valueOf(eventId).isBlank()) {
            return String.valueOf(event.get("transactionId"));
        }
        return String.valueOf(eventId);
    }

    private String getAsString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private int getAsInt(Object value) {
        return value instanceof Number ? ((Number) value).intValue() : 0;
    }

    private double getAsDouble(Object value) {
        return value instanceof Number ? ((Number) value).doubleValue() : 0;
    }
}
