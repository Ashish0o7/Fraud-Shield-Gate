package com.shieldgate.alerting.managed;

import com.shieldgate.alerting.api.Notification;
import com.shieldgate.alerting.api.User;
import com.shieldgate.alerting.core.NotificationService;
import com.shieldgate.alerting.db.EmailOutboxDAO;
import com.shieldgate.alerting.db.EmailOutboxItem;
import com.shieldgate.alerting.db.NotificationDAO;
import com.shieldgate.alerting.db.UserDAO;
import io.dropwizard.lifecycle.Managed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class EmailOutboxDispatcher implements Managed {
    private static final Logger log = LoggerFactory.getLogger(EmailOutboxDispatcher.class);

    private final EmailOutboxDAO outboxDAO;
    private final NotificationDAO notificationDAO;
    private final UserDAO userDAO;
    private final NotificationService notificationService;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public EmailOutboxDispatcher(EmailOutboxDAO outboxDAO,
            NotificationDAO notificationDAO,
            UserDAO userDAO,
            NotificationService notificationService) {
        this.outboxDAO = outboxDAO;
        this.notificationDAO = notificationDAO;
        this.userDAO = userDAO;
        this.notificationService = notificationService;
    }

    @Override
    public void start() {
        scheduler.scheduleWithFixedDelay(this::dispatchBatch, 1, 1, TimeUnit.SECONDS);
    }

    private void dispatchBatch() {
        try {
            List<EmailOutboxItem> ready = outboxDAO.fetchReady(50);
            for (EmailOutboxItem row : ready) {
                processOutboxRow(row);
            }
        } catch (Exception e) {
            log.error("Email outbox dispatcher batch failed", e);
        }
    }

    private void processOutboxRow(EmailOutboxItem row) {
        long outboxId = row.getId();
        long notificationId = row.getNotificationId();
        try {
            Optional<Notification> notificationOpt = notificationDAO.findById(notificationId);
            if (notificationOpt.isEmpty()) {
                outboxDAO.markFailed(outboxId, "Notification not found");
                return;
            }

            Notification notification = notificationOpt.get();
            Optional<User> userOpt = userDAO.findById(notification.getUserId());
            if (userOpt.isEmpty()) {
                outboxDAO.markFailed(outboxId, "Recipient not found");
                notificationDAO.updateDeliveryStatus(notificationId, "FAILED", "Recipient not found", false);
                return;
            }

            NotificationService.DeliveryResult result = notificationService.deliverEmail(userOpt.get(), notification);
            if (result.isDelivered()) {
                outboxDAO.markSent(outboxId);
                notificationDAO.updateDeliveryStatus(notificationId, result.getStatus(), null, true);
            } else {
                outboxDAO.markRetry(outboxId, result.getError(), 5);
                notificationDAO.updateDeliveryStatus(notificationId, result.getStatus(), result.getError(), false);
            }
        } catch (Exception e) {
            outboxDAO.markRetry(outboxId, e.getMessage(), 5);
        }
    }

    @Override
    public void stop() {
        scheduler.shutdownNow();
    }
}
