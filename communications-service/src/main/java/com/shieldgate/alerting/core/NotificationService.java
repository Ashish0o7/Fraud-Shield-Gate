package com.shieldgate.alerting.core;

import com.shieldgate.alerting.api.Notification;
import com.shieldgate.alerting.api.User;
import com.shieldgate.alerting.AlertingConfiguration;
import com.shieldgate.alerting.db.NotificationDAO;
import com.shieldgate.alerting.db.UserDAO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.util.Properties;
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
    private final AlertingConfiguration.EmailConfiguration emailConfig;

    public NotificationService(UserDAO userDAO, NotificationDAO notificationDAO,
            AlertingConfiguration.EmailConfiguration emailConfig) {
        this.userDAO = userDAO;
        this.notificationDAO = notificationDAO;
        this.emailConfig = emailConfig;
    }

    public DeliveryResult deliverEmail(User user, Notification notification) {
        return sendEmailNotification(user, notification);
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

        // Prefer transaction owner if present and registered.
        List<User> usersToNotify = resolveRecipients(status, txUserId);

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
            notification.setDeliveryStatus("PENDING");
            notification.setDeliveryError(null);

            try {
                long id = notificationDAO.insert(notification);
                notification.setId(id);
                DeliveryResult result = sendEmailNotification(user, notification);
                notificationDAO.updateDeliveryStatus(id, result.status, result.error, result.delivered);
            } catch (Exception e) {
                log.error("Failed to create notification for user={}: {}", user.getEmail(), e.getMessage());
            }
        }

        if (!usersToNotify.isEmpty()) {
            log.info("Sent {} notifications for {} transaction txId={}",
                    usersToNotify.size(), status, transactionId);
        }
    }

    private List<User> resolveRecipients(String status, String txUserId) {
        if (txUserId != null && !txUserId.isBlank()) {
            var owner = userDAO.findByUserId(txUserId);
            if (owner.isPresent() && wantsStatus(owner.get(), status)) {
                return List.of(owner.get());
            }
        }
        return userDAO.findUsersToNotify(status);
    }

    private boolean wantsStatus(User user, String status) {
        if ("BLOCKED".equals(status)) {
            return user.isNotifyBlocked();
        }
        if ("FLAGGED".equals(status)) {
            return user.isNotifyFlagged();
        }
        return false;
    }

    /**
     * Simulated email notification — logs to console.
     * In production, replace with JavaMail/SendGrid/SES integration.
     */
    private DeliveryResult sendEmailNotification(User user, Notification notification) {
        String subject = "[ShieldGate Alert] Transaction " + notification.getStatus() + " — " + notification.getTransactionId();
        String body = buildEmailBody(notification);
        if (emailConfig.isDemoMode()) {
            log.info("═══════════════════════════════════════════════════════════");
            log.info("📧 EMAIL NOTIFICATION (SIMULATED)");
            log.info("   To: {} <{}>", user.getName(), user.getEmail());
            log.info("   Subject: {}", subject);
            log.info("   Body:");
            for (String line : body.split("\n")) {
                log.info("   {}", line);
            }
            log.info("═══════════════════════════════════════════════════════════");
            return DeliveryResult.delivered();
        }

        try {
            Properties props = new Properties();
            props.put("mail.smtp.host", emailConfig.getSmtpHost());
            props.put("mail.smtp.port", String.valueOf(emailConfig.getSmtpPort()));
            props.put("mail.smtp.auth", String.valueOf(!emailConfig.getUsername().isBlank()));
            props.put("mail.smtp.starttls.enable", String.valueOf(emailConfig.isStartTls()));
            props.put("mail.smtp.ssl.enable", String.valueOf(emailConfig.isSsl()));

            Session session;
            if (!emailConfig.getUsername().isBlank()) {
                session = Session.getInstance(props, new Authenticator() {
                    @Override
                    protected PasswordAuthentication getPasswordAuthentication() {
                        return new PasswordAuthentication(emailConfig.getUsername(), emailConfig.getPassword());
                    }
                });
            } else {
                session = Session.getInstance(props);
            }

            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(emailConfig.getSender()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(user.getEmail()));
            message.setSubject(subject);
            message.setText(body);
            Transport.send(message);
            log.info("Delivered email via SMTP to {} for txId={}", user.getEmail(), notification.getTransactionId());
            return DeliveryResult.delivered();
        } catch (Exception e) {
            log.error("SMTP delivery failed for {} txId={}: {}", user.getEmail(), notification.getTransactionId(), e.getMessage());
            return DeliveryResult.failed(e.getMessage());
        }
    }

    private String buildEmailBody(Notification notification) {
        return "A transaction has been " + notification.getStatus() + ".\n"
                + "Transaction User: " + notification.getTxUserId() + "\n"
                + "Amount: ₹" + String.format("%.2f", notification.getAmount()) + "\n"
                + "Location: " + notification.getLocation() + "\n"
                + "Risk Score: " + notification.getRiskScore() + "/100\n"
                + "Reason: " + notification.getRiskReason();
    }

    public static class DeliveryResult {
        private final String status;
        private final String error;
        private final boolean delivered;

        public DeliveryResult(String status, String error, boolean delivered) {
            this.status = status;
            this.error = error;
            this.delivered = delivered;
        }

        public static DeliveryResult delivered() {
            return new DeliveryResult("DELIVERED", null, true);
        }

        public static DeliveryResult failed(String error) {
            return new DeliveryResult("FAILED", error, false);
        }

        public String getStatus() {
            return status;
        }

        public String getError() {
            return error;
        }

        public boolean isDelivered() {
            return delivered;
        }
    }
}
