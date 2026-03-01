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

    @JsonProperty("aerospikeHost")
    public String getAerospikeHost() { return aerospikeHost; }

    @JsonProperty("aerospikeHost")
    public void setAerospikeHost(String aerospikeHost) { this.aerospikeHost = aerospikeHost; }

    @JsonProperty("aerospikePort")
    public int getAerospikePort() { return aerospikePort; }

    @JsonProperty("aerospikePort")
    public void setAerospikePort(int aerospikePort) { this.aerospikePort = aerospikePort; }

    @JsonProperty("aerospikeNamespace")
    public String getAerospikeNamespace() { return aerospikeNamespace; }

    @JsonProperty("aerospikeNamespace")
    public void setAerospikeNamespace(String aerospikeNamespace) { this.aerospikeNamespace = aerospikeNamespace; }

    @JsonProperty("rabbitHost")
    public String getRabbitHost() { return rabbitHost; }

    @JsonProperty("rabbitHost")
    public void setRabbitHost(String rabbitHost) { this.rabbitHost = rabbitHost; }

    @JsonProperty("rabbitPort")
    public int getRabbitPort() { return rabbitPort; }

    @JsonProperty("rabbitPort")
    public void setRabbitPort(int rabbitPort) { this.rabbitPort = rabbitPort; }

    @JsonProperty("elasticHost")
    public String getElasticHost() { return elasticHost; }

    @JsonProperty("elasticHost")
    public void setElasticHost(String elasticHost) { this.elasticHost = elasticHost; }

    @JsonProperty("elasticPort")
    public int getElasticPort() { return elasticPort; }

    @JsonProperty("elasticPort")
    public void setElasticPort(int elasticPort) { this.elasticPort = elasticPort; }
}
