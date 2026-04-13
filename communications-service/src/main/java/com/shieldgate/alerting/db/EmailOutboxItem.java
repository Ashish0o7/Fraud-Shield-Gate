package com.shieldgate.alerting.db;

public class EmailOutboxItem {
    private long id;
    private long notificationId;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public long getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(long notificationId) {
        this.notificationId = notificationId;
    }
}
