package com.smartcharge.flink.model;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Parsed signal values, written to the parsed Parquet table.
 */
public class ParsedMessage {
    private String id;
    private String messageName;
    private long timestamp;
    private Map<String, Double> signals;

    public ParsedMessage() {
        this.signals = new LinkedHashMap<>();
    }

    public ParsedMessage(String messageName, long timestamp) {
        this.id = UUID.randomUUID().toString();
        this.messageName = messageName;
        this.timestamp = timestamp;
        this.signals = new LinkedHashMap<>();
    }

    public void putSignal(String name, double value) {
        signals.put(name, value);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMessageName() { return messageName; }
    public void setMessageName(String messageName) { this.messageName = messageName; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public Map<String, Double> getSignals() { return signals; }
    public void setSignals(Map<String, Double> signals) { this.signals = signals; }

    @Override
    public String toString() {
        return "ParsedMessage{" + messageName + " " + signals + "}";
    }
}
