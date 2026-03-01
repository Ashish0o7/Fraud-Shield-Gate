package com.shieldgate.core;

import com.aerospike.client.AerospikeClient;
import com.aerospike.client.Bin;
import com.aerospike.client.Key;
import com.aerospike.client.Operation;
import com.aerospike.client.Record;
import com.aerospike.client.policy.WritePolicy;
import com.shieldgate.api.UserState;
import io.dropwizard.lifecycle.Managed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AerospikeService implements Managed {
    private static final Logger log = LoggerFactory.getLogger(AerospikeService.class);

    private final AerospikeClient client;
    private final String namespace;
    private final String setName = "users";

    public AerospikeService(String host, int port, String namespace) {
        this.client = new AerospikeClient(host, port);
        this.namespace = namespace;
        log.info("Connected to Aerospike at {}:{}, namespace={}", host, port, namespace);
    }

    /**
     * Reads user state from Aerospike. Returns null for unknown users.
     */
    public UserState getUserState(String userId) {
        Key key = new Key(namespace, setName, userId);
        Record record = client.get(null, key);
        if (record == null) {
            return null; // indicates new user
        }

        int trustScore = record.getInt("trustScore");
        int txCount = record.getInt("txCount");
        String lastLoc = record.getString("lastLoc");
        long lastTxTime = record.getLong("lastTxTime");

        // Reset logic for 10-minute trailing window
        if (System.currentTimeMillis() - lastTxTime > 10 * 60 * 1000) {
            txCount = 0;
        }

        return new UserState(userId, trustScore, txCount, lastLoc, lastTxTime);
    }

    /**
     * Atomically increments txCount and updates location/timestamp/trustScore
     * using Aerospike's operate() — prevents the read-modify-write race condition
     * that would occur with separate get() + put() calls under concurrent load.
     */
    public void updateUserStateAtomically(String userId, String location, long timestamp, int trustScore) {
        Key key = new Key(namespace, setName, userId);
        client.operate(null, key,
                Operation.add(new Bin("txCount", 1)),
                Operation.put(new Bin("lastLoc", location)),
                Operation.put(new Bin("lastTxTime", timestamp)),
                Operation.put(new Bin("trustScore", trustScore)));
    }

    /**
     * Saves the full user state (used for initializing new users).
     */
    public void saveUserState(UserState state) {
        Key key = new Key(namespace, setName, state.getUserId());
        Bin trustScoreBin = new Bin("trustScore", state.getTrustScore());
        Bin txCountBin = new Bin("txCount", state.getTxCountLast10Mins());
        Bin lastLocBin = new Bin("lastLoc", state.getLastLocation());
        Bin lastTxTimeBin = new Bin("lastTxTime", state.getLastTxTimestamp());

        WritePolicy policy = new WritePolicy();
        client.put(policy, key, trustScoreBin, txCountBin, lastLocBin, lastTxTimeBin);
    }

    public boolean isConnected() {
        return client.isConnected();
    }

    @Override
    public void start() {
        // Connection already established in constructor
    }

    @Override
    public void stop() {
        log.info("Closing Aerospike connection");
        client.close();
    }
}
