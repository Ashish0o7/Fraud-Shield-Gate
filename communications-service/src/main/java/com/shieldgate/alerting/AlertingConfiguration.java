package com.shieldgate.alerting;

import io.dropwizard.core.Configuration;
import io.dropwizard.db.DataSourceFactory;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public class AlertingConfiguration extends Configuration {

    @Valid
    @NotNull
    @JsonProperty("database")
    private DataSourceFactory database = new DataSourceFactory();

    @NotEmpty
    private String rabbitHost;
    private int rabbitPort;

    @NotEmpty
    private String shieldgateBackendUrl;
    @Valid
    @NotNull
    @JsonProperty("email")
    private EmailConfiguration email = new EmailConfiguration();

    @JsonProperty("database")
    public DataSourceFactory getDataSourceFactory() {
        return database;
    }

    @JsonProperty("database")
    public void setDataSourceFactory(DataSourceFactory factory) {
        this.database = factory;
    }

    @JsonProperty("rabbitHost")
    public String getRabbitHost() {
        return rabbitHost;
    }

    @JsonProperty("rabbitHost")
    public void setRabbitHost(String rabbitHost) {
        this.rabbitHost = rabbitHost;
    }

    @JsonProperty("rabbitPort")
    public int getRabbitPort() {
        return rabbitPort;
    }

    @JsonProperty("rabbitPort")
    public void setRabbitPort(int rabbitPort) {
        this.rabbitPort = rabbitPort;
    }

    @JsonProperty("shieldgateBackendUrl")
    public String getShieldgateBackendUrl() {
        return shieldgateBackendUrl;
    }

    @JsonProperty("shieldgateBackendUrl")
    public void setShieldgateBackendUrl(String url) {
        this.shieldgateBackendUrl = url;
    }

    @JsonProperty("email")
    public EmailConfiguration getEmail() {
        return email;
    }

    @JsonProperty("email")
    public void setEmail(EmailConfiguration email) {
        this.email = email;
    }

    public static class EmailConfiguration {
        private boolean demoMode = true;
        private String sender = "no-reply@shieldgate.local";
        private String smtpHost = "localhost";
        private int smtpPort = 1025;
        private String username = "";
        private String password = "";
        private boolean startTls = false;
        private boolean ssl = false;

        @JsonProperty("demoMode")
        public boolean isDemoMode() {
            return demoMode;
        }

        @JsonProperty("demoMode")
        public void setDemoMode(boolean demoMode) {
            this.demoMode = demoMode;
        }

        @JsonProperty("sender")
        public String getSender() {
            return sender;
        }

        @JsonProperty("sender")
        public void setSender(String sender) {
            this.sender = sender;
        }

        @JsonProperty("smtpHost")
        public String getSmtpHost() {
            return smtpHost;
        }

        @JsonProperty("smtpHost")
        public void setSmtpHost(String smtpHost) {
            this.smtpHost = smtpHost;
        }

        @JsonProperty("smtpPort")
        public int getSmtpPort() {
            return smtpPort;
        }

        @JsonProperty("smtpPort")
        public void setSmtpPort(int smtpPort) {
            this.smtpPort = smtpPort;
        }

        @JsonProperty("username")
        public String getUsername() {
            return username;
        }

        @JsonProperty("username")
        public void setUsername(String username) {
            this.username = username;
        }

        @JsonProperty("password")
        public String getPassword() {
            return password;
        }

        @JsonProperty("password")
        public void setPassword(String password) {
            this.password = password;
        }

        @JsonProperty("startTls")
        public boolean isStartTls() {
            return startTls;
        }

        @JsonProperty("startTls")
        public void setStartTls(boolean startTls) {
            this.startTls = startTls;
        }

        @JsonProperty("ssl")
        public boolean isSsl() {
            return ssl;
        }

        @JsonProperty("ssl")
        public void setSsl(boolean ssl) {
            this.ssl = ssl;
        }
    }
}
