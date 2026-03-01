package com.shieldgate.alerting.resources;

import com.shieldgate.alerting.api.Notification;
import com.shieldgate.alerting.db.NotificationDAO;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

@Path("/api/notifications")
@Produces(MediaType.APPLICATION_JSON)
public class NotificationResource {

    private final NotificationDAO notificationDAO;

    public NotificationResource(NotificationDAO notificationDAO) {
        this.notificationDAO = notificationDAO;
    }

    /**
     * Get all notifications for a specific user.
     */
    @GET
    @Path("/user/{userId}")
    public Response getUserNotifications(@PathParam("userId") long userId) {
        List<Notification> notifications = notificationDAO.findByUserId(userId);
        return Response.ok(Map.of(
                "notifications", notifications,
                "total", notifications.size())).build();
    }

    /**
     * Get latest notifications across all users.
     */
    @GET
    @Path("/latest")
    public Response getLatest() {
        List<Notification> notifications = notificationDAO.findLatest();
        return Response.ok(Map.of(
                "notifications", notifications,
                "total", notifications.size())).build();
    }

    /**
     * Get notification count for a user.
     */
    @GET
    @Path("/count/{userId}")
    public Response getCount(@PathParam("userId") long userId) {
        long count = notificationDAO.countByUserId(userId);
        return Response.ok(Map.of("userId", userId, "count", count)).build();
    }
}
