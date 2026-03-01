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
}
