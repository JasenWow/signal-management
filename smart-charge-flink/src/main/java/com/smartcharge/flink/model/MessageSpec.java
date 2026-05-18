package com.smartcharge.flink.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Full message specification loaded from the signal management tool's exported JSON.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class MessageSpec {
    private MessageInfo message;
    private List<SignalDef> signals;

    public MessageInfo getMessage() { return message; }
    public void setMessage(MessageInfo message) { this.message = message; }

    public List<SignalDef> getSignals() { return signals; }
    public void setSignals(List<SignalDef> signals) { this.signals = signals; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MessageInfo {
        private String name;
        private String description;
        private int frameSize;
        private String byteOrder;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public int getFrameSize() { return frameSize; }
        public void setFrameSize(int frameSize) { this.frameSize = frameSize; }

        public String getByteOrder() { return byteOrder; }
        public void setByteOrder(String byteOrder) { this.byteOrder = byteOrder; }
    }
}
