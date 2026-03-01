package com.shieldgate.alerting;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shieldgate.alerting.core.NotificationService;
import com.shieldgate.alerting.db.NotificationDAO;
import com.shieldgate.alerting.db.UserDAO;
import com.shieldgate.alerting.managed.NotificationConsumer;
import com.shieldgate.alerting.resources.NotificationResource;
import com.shieldgate.alerting.resources.TransactionProxyResource;
import com.shieldgate.alerting.resources.UserResource;

import io.dropwizard.core.Application;
import io.dropwizard.core.setup.Bootstrap;
import io.dropwizard.core.setup.Environment;
import io.dropwizard.jdbi3.JdbiFactory;
import org.eclipse.jetty.servlets.CrossOriginFilter;
import org.jdbi.v3.core.Jdbi;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterRegistration;
import java.util.EnumSet;

public class AlertingApplication extends Application<AlertingConfiguration> {
    private static final Logger log = LoggerFactory.getLogger(AlertingApplication.class);

    public static void main(String[] args) throws Exception {
        new AlertingApplication().run(args);
    }

    @Override
    public String getName() {
        return "ShieldGate Alerting Service";
    }

    @Override
    public void initialize(Bootstrap<AlertingConfiguration> bootstrap) {
        // Initialization
    }

    @Override
    public void run(AlertingConfiguration config, Environment env) throws Exception {
        // ── CORS ──
        final FilterRegistration.Dynamic cors = env.servlets().addFilter("CORS", CrossOriginFilter.class);
        cors.setInitParameter(CrossOriginFilter.ALLOWED_ORIGINS_PARAM, "*");
        cors.setInitParameter(CrossOriginFilter.ALLOWED_HEADERS_PARAM,
                "X-Requested-With,Content-Type,Accept,Origin,Authorization");
        cors.setInitParameter(CrossOriginFilter.ALLOWED_METHODS_PARAM, "OPTIONS,GET,PUT,POST,DELETE,HEAD");
        cors.addMappingForUrlPatterns(EnumSet.allOf(DispatcherType.class), true, "/*");

        // ── Database (JDBI + PostgreSQL) ──
        final JdbiFactory factory = new JdbiFactory();
        final Jdbi jdbi = factory.build(env, config.getDataSourceFactory(), "postgresql");

        // Create DAOs
        UserDAO userDAO = jdbi.onDemand(UserDAO.class);
        NotificationDAO notificationDAO = jdbi.onDemand(NotificationDAO.class);

        // Create tables if they don't exist
        userDAO.createTable();
        notificationDAO.createTable();
        // Idempotent migrations — safe to run on every startup
        userDAO.migrateSchema();
        userDAO.backfillUserIds();
        log.info("Database tables initialized and migrated");

        // ── Core Services ──
        NotificationService notificationService = new NotificationService(userDAO, notificationDAO);

        ObjectMapper mapper = env.getObjectMapper();

        // ── RabbitMQ Consumer ──
        NotificationConsumer consumer = new NotificationConsumer(
                config.getRabbitHost(), config.getRabbitPort(), mapper, notificationService);
        env.lifecycle().manage(consumer);

        // ── JAX-RS Resources ──
        env.jersey().register(new UserResource(userDAO));
        env.jersey().register(new NotificationResource(notificationDAO));
        env.jersey().register(new TransactionProxyResource(config.getShieldgateBackendUrl()));

        log.info("ShieldGate Alerting Service started — listening on port 8090");
    }
}
