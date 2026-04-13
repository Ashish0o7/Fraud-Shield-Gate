package com.shieldgate.alerting.resources;

import com.shieldgate.alerting.api.Notification;
import com.shieldgate.alerting.AlertingConfiguration;
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
    private final com.shieldgate.alerting.db.UserDAO userDAO;
    private final AlertingConfiguration.EmailConfiguration emailConfiguration;

    public NotificationResource(NotificationDAO notificationDAO, com.shieldgate.alerting.db.UserDAO userDAO,
            AlertingConfiguration.EmailConfiguration emailConfiguration) {
        this.notificationDAO = notificationDAO;
        this.userDAO = userDAO;
        this.emailConfiguration = emailConfiguration;
    }

    /**
     * Get all notifications for a specific user.
     */
    @GET
    @Path("/user/{userId}")
    public Response getUserNotifications(@PathParam("userId") String externalId) {
        return userDAO.findByUserId(externalId)
                .map(user -> {
                    List<Notification> notifications = notificationDAO.findByUserId(user.getId());
                    return Response.ok(Map.of(
                            "notifications", notifications,
                            "total", notifications.size())).build();
                })
                .orElse(Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "User not found")).build());
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

    @GET
    @Path("/metrics/recipients")
    public Response recipientMetrics(@QueryParam("hours") @DefaultValue("24") int hours) {
        int boundedHours = Math.max(1, Math.min(hours, 24 * 30));
        return Response.ok(Map.of(
                "hours", boundedHours,
                "recipients", notificationDAO.recipientMetrics(boundedHours))).build();
    }

    @GET
    @Path("/mode")
    public Response mode() {
        return Response.ok(Map.of(
                "demoMode", emailConfiguration.isDemoMode(),
                "smtpHost", emailConfiguration.getSmtpHost(),
                "smtpPort", emailConfiguration.getSmtpPort(),
                "sender", emailConfiguration.getSender())).build();
    }

    /**
     * Get notification count for a user.
     */
    @GET
    @Path("/count/{userId}")
    public Response getCount(@PathParam("userId") String externalId) {
        return userDAO.findByUserId(externalId)
                .map(user -> {
                    long count = notificationDAO.countByUserId(user.getId());
                    return Response.ok(Map.of("userId", externalId, "count", count)).build();
                })
                .orElse(Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "User not found")).build());
    }
}
