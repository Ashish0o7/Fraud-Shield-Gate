package com.shieldgate.alerting.core;

import com.shieldgate.alerting.api.Notification;
import com.shieldgate.alerting.api.User;
import com.shieldgate.alerting.db.NotificationDAO;
import com.shieldgate.alerting.db.UserDAO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

/**
 * Handles notification dispatch when fraud events arrive.
 * Currently simulates email via console logging (easily swappable for real
 * SMTP).
 */
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final UserDAO userDAO;
    private final NotificationDAO notificationDAO;

    public NotificationService(UserDAO userDAO, NotificationDAO notificationDAO) {
        this.userDAO = userDAO;
        this.notificationDAO = notificationDAO;
    }

    /**
     * Process an evaluated transaction event from RabbitMQ.
     * Looks up all users who opted in for this event type and creates
     * notifications.
     */
    public void processEvent(Map<String, Object> event) {
        String status = (String) event.get("status");
        if (!"BLOCKED".equals(status) && !"FLAGGED".equals(status)) {
            return; // Only notify for BLOCKED or FLAGGED
        }

        String transactionId = String.valueOf(event.get("transactionId"));
        String txUserId = (String) event.get("userId");
        String riskReason = (String) event.get("riskReason");
        int riskScore = event.get("riskScore") instanceof Number
                ? ((Number) event.get("riskScore")).intValue()
                : 0;
        double amount = event.get("amount") instanceof Number
                ? ((Number) event.get("amount")).doubleValue()
                : 0;
        String location = (String) event.get("location");

        // Find all users who should be notified for this status
        List<User> usersToNotify = userDAO.findUsersToNotify(status);

        for (User user : usersToNotify) {
            // Create notification record
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

            try {
                notificationDAO.insert(notification);
                sendEmailNotification(user, notification);
            } catch (Exception e) {
                log.error("Failed to create notification for user={}: {}", user.getEmail(), e.getMessage());
            }
        }

        if (!usersToNotify.isEmpty()) {
            log.info("Sent {} notifications for {} transaction txId={}",
                    usersToNotify.size(), status, transactionId);
        }
    }

    /**
     * Simulated email notification — logs to console.
     * In production, replace with JavaMail/SendGrid/SES integration.
     */
    private void sendEmailNotification(User user, Notification notification) {
        log.info("═══════════════════════════════════════════════════════════");
        log.info("📧 EMAIL NOTIFICATION");
        log.info("   To: {} <{}>", user.getName(), user.getEmail());
        log.info("   Subject: [ShieldGate Alert] Transaction {} — {}",
                notification.getStatus(), notification.getTransactionId());
        log.info("   Body:");
        log.info("   A transaction has been {}.", notification.getStatus());
        log.info("   Transaction User: {}", notification.getTxUserId());
        log.info("   Amount: ₹{}", String.format("%.2f", notification.getAmount()));
        log.info("   Location: {}", notification.getLocation());
        log.info("   Risk Score: {}/100", notification.getRiskScore());
        log.info("   Reason: {}", notification.getRiskReason());
        log.info("═══════════════════════════════════════════════════════════");
    }
}
