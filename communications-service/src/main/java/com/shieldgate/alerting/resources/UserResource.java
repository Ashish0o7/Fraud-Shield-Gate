package com.shieldgate.alerting.resources;

import com.shieldgate.alerting.api.User;
import com.shieldgate.alerting.db.UserDAO;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.mindrot.jbcrypt.BCrypt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {
    private static final Logger log = LoggerFactory.getLogger(UserResource.class);

    /**
     * BCrypt cost factor.
     * Industry standard for web APIs is 10 (~100ms per hash).
     * Cost 12 was ~800ms — unacceptably slow per request.
     */
    private static final int BCRYPT_COST = 10;

    /**
     * Dedicated thread pool for password hashing.
     * BCrypt is CPU-bound; running it off the Jetty/Dropwizard request thread
     * prevents thread starvation under concurrent registrations/logins.
     */
    private static final ExecutorService CRYPTO_POOL = Executors.newFixedThreadPool(4);

    private final UserDAO userDAO;

    public UserResource(UserDAO userDAO) {
        this.userDAO = userDAO;
    }

    /**
     * Generates a human-readable, unique user identifier.
     * Format: "usr_" + first 12 hex chars of a UUID → e.g. "usr_a3f9b2c14d8e"
     * Collision probability at 12 hex chars (48 bits): negligible for millions of
     * users.
     */
    private static String generateUserId() {
        return "usr_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /**
     * Register a new user account.
     * Hashing happens on CRYPTO_POOL — request thread is not blocked for ~100ms.
     */
    @POST
    @Path("/register")
    public Response register(Map<String, Object> body) {
        String email = (String) body.get("email");
        String name = (String) body.get("name");
        String password = (String) body.get("password");
        String location = (String) body.get("location");

        if (email == null || name == null || password == null) {
            return Response.status(400)
                    .entity(Map.of("error", "email, name, and password are required"))
                    .build();
        }

        // Check email uniqueness before hashing (fast DB lookup first)
        if (userDAO.findByEmail(email).isPresent()) {
            return Response.status(409)
                    .entity(Map.of("error", "Email already registered"))
                    .build();
        }

        // Hash password off the request thread
        String hash;
        try {
            hash = CompletableFuture
                    .supplyAsync(() -> BCrypt.hashpw(password, BCrypt.gensalt(BCRYPT_COST)), CRYPTO_POOL)
                    .get();
        } catch (Exception e) {
            log.error("Password hashing failed", e);
            return Response.serverError().entity(Map.of("error", "Internal error")).build();
        }

        String userId = generateUserId();

        User user = new User();
        user.setUserId(userId);
        user.setEmail(email);
        user.setName(name);
        user.setLocation(location);
        user.setPasswordHash(hash);
        user.setNotifyBlocked(true);
        user.setNotifyFlagged(false);

        long dbId = userDAO.insert(user);
        user.setId(dbId);

        log.info("Registered user {} <{}>  userId={}", name, email, userId);
        return Response.status(201).entity(user).build();
    }

    /**
     * Login with email and password.
     * Password verification also runs off the request thread.
     */
    @POST
    @Path("/login")
    public Response login(Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            return Response.status(400)
                    .entity(Map.of("error", "email and password are required"))
                    .build();
        }

        Optional<User> userOpt = userDAO.findByEmail(email);
        if (userOpt.isEmpty()) {
            return Response.status(401).entity(Map.of("error", "Invalid credentials")).build();
        }

        User user = userOpt.get();

        // Verify off the request thread
        boolean valid;
        try {
            final String stored = user.getPasswordHash();
            valid = CompletableFuture
                    .supplyAsync(() -> BCrypt.checkpw(password, stored), CRYPTO_POOL)
                    .get();
        } catch (Exception e) {
            log.error("Password verification failed", e);
            return Response.serverError().entity(Map.of("error", "Internal error")).build();
        }

        if (!valid) {
            return Response.status(401).entity(Map.of("error", "Invalid credentials")).build();
        }

        log.info("User logged in: {} ({})", email, user.getUserId());
        return Response.ok(user).build();
    }

    @GET
    @Path("/{id}")
    public Response getUser(@PathParam("id") long id) {
        Optional<User> user = userDAO.findById(id);
        if (user.isEmpty()) {
            return Response.status(404).entity(Map.of("error", "User not found")).build();
        }
        return Response.ok(user.get()).build();
    }

    @PUT
    @Path("/{id}/preferences")
    public Response updatePreferences(@PathParam("id") long id, Map<String, Boolean> body) {
        Optional<User> userOpt = userDAO.findById(id);
        if (userOpt.isEmpty()) {
            return Response.status(404).entity(Map.of("error", "User not found")).build();
        }

        boolean notifyBlocked = body.getOrDefault("notifyBlocked", true);
        boolean notifyFlagged = body.getOrDefault("notifyFlagged", false);

        userDAO.updatePreferences(id, notifyBlocked, notifyFlagged);

        log.info("Updated prefs for user {}: blocked={}, flagged={}", id, notifyBlocked, notifyFlagged);
        return Response.ok(Map.of("notifyBlocked", notifyBlocked, "notifyFlagged", notifyFlagged)).build();
    }

    @GET
    public Response listUsers() {
        List<User> users = userDAO.findAll();
        return Response.ok(users).build();
    }
}
