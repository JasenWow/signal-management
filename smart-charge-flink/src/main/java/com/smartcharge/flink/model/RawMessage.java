package com.smartcharge.flink.model;

import java.util.UUID;

/**
 * Raw CAN frame with metadata, written to the raw Parquet table.
 */
public class RawMessage {
    private String id;
    private String messageName;
    private String hexData;
    private long timestamp;

    public RawMessage() {}

    public RawMessage(String messageName, String hexData, long timestamp) {
        this.id = UUID.randomUUID().toString();
        this.messageName = messageName;
        this.hexData = hexData;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMessageName() { return messageName; }
    public void setMessageName(String messageName) { this.messageName = messageName; }

    public String getHexData() { return hexData; }
    public void setHexData(String hexData) { this.hexData = hexData; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
