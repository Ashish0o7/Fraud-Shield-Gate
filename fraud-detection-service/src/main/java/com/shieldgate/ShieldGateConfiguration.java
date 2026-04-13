package com.shieldgate;

import io.dropwizard.core.Configuration;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;

public class ShieldGateConfiguration extends Configuration {

    @NotEmpty
    private String aerospikeHost;
    private int aerospikePort;
    @NotEmpty
    private String aerospikeNamespace;

    @NotEmpty
    private String rabbitHost;
    private int rabbitPort;

    @NotEmpty
    private String elasticHost;
    private int elasticPort;

    @NotEmpty
    private String mlServiceUrl;
    private int mlTimeoutMillis = 120;
    private int mlBulkheadMaxConcurrent = 50;
    private int rabbitPublishMaxRetries = 3;
    private boolean redisBackplaneEnabled = false;
    private String redisHost = "localhost";
    private int redisPort = 6379;
    private String redisChannel = "shieldgate.telemetry";

    @JsonProperty("aerospikeHost")
    public String getAerospikeHost() {
        return aerospikeHost;
    }

    @JsonProperty("aerospikeHost")
    public void setAerospikeHost(String aerospikeHost) {
        this.aerospikeHost = aerospikeHost;
    }

    @JsonProperty("aerospikePort")
    public int getAerospikePort() {
        return aerospikePort;
    }

    @JsonProperty("aerospikePort")
    public void setAerospikePort(int aerospikePort) {
        this.aerospikePort = aerospikePort;
    }

    @JsonProperty("aerospikeNamespace")
    public String getAerospikeNamespace() {
        return aerospikeNamespace;
    }

    @JsonProperty("aerospikeNamespace")
    public void setAerospikeNamespace(String aerospikeNamespace) {
        this.aerospikeNamespace = aerospikeNamespace;
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

    @JsonProperty("elasticHost")
    public String getElasticHost() {
        return elasticHost;
    }

    @JsonProperty("elasticHost")
    public void setElasticHost(String elasticHost) {
        this.elasticHost = elasticHost;
    }

    @JsonProperty("elasticPort")
    public int getElasticPort() {
        return elasticPort;
    }

    @JsonProperty("elasticPort")
    public void setElasticPort(int elasticPort) {
        this.elasticPort = elasticPort;
    }

    @JsonProperty("mlServiceUrl")
    public String getMlServiceUrl() {
        return mlServiceUrl;
    }

    @JsonProperty("mlServiceUrl")
    public void setMlServiceUrl(String mlServiceUrl) {
        this.mlServiceUrl = mlServiceUrl;
    }

    @JsonProperty("mlTimeoutMillis")
    public int getMlTimeoutMillis() {
        return mlTimeoutMillis;
    }

    @JsonProperty("mlTimeoutMillis")
    public void setMlTimeoutMillis(int mlTimeoutMillis) {
        this.mlTimeoutMillis = mlTimeoutMillis;
    }

    @JsonProperty("mlBulkheadMaxConcurrent")
    public int getMlBulkheadMaxConcurrent() {
        return mlBulkheadMaxConcurrent;
    }

    @JsonProperty("mlBulkheadMaxConcurrent")
    public void setMlBulkheadMaxConcurrent(int mlBulkheadMaxConcurrent) {
        this.mlBulkheadMaxConcurrent = mlBulkheadMaxConcurrent;
    }

    @JsonProperty("rabbitPublishMaxRetries")
    public int getRabbitPublishMaxRetries() {
        return rabbitPublishMaxRetries;
    }

    @JsonProperty("rabbitPublishMaxRetries")
    public void setRabbitPublishMaxRetries(int rabbitPublishMaxRetries) {
        this.rabbitPublishMaxRetries = rabbitPublishMaxRetries;
    }

    @JsonProperty("redisBackplaneEnabled")
    public boolean isRedisBackplaneEnabled() {
        return redisBackplaneEnabled;
    }

    @JsonProperty("redisBackplaneEnabled")
    public void setRedisBackplaneEnabled(boolean redisBackplaneEnabled) {
        this.redisBackplaneEnabled = redisBackplaneEnabled;
    }

    @JsonProperty("redisHost")
    public String getRedisHost() {
        return redisHost;
    }

    @JsonProperty("redisHost")
    public void setRedisHost(String redisHost) {
        this.redisHost = redisHost;
    }

    @JsonProperty("redisPort")
    public int getRedisPort() {
        return redisPort;
    }

    @JsonProperty("redisPort")
    public void setRedisPort(int redisPort) {
        this.redisPort = redisPort;
    }

    @JsonProperty("redisChannel")
    public String getRedisChannel() {
        return redisChannel;
    }

    @JsonProperty("redisChannel")
    public void setRedisChannel(String redisChannel) {
        this.redisChannel = redisChannel;
    }
}
