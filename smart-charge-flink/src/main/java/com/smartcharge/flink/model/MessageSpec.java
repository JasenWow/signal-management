package com.smartcharge.flink.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Full message specification loaded from the signal management tool's exported JSON.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class MessageSpec {
    private MessageInfo message;
    private List<SignalGroupDef> signalGroups;
    private List<SignalDef> signals;

    public MessageInfo getMessage() { return message; }
    public void setMessage(MessageInfo message) { this.message = message; }

    public List<SignalGroupDef> getSignalGroups() { return signalGroups; }
    public void setSignalGroups(List<SignalGroupDef> signalGroups) { this.signalGroups = signalGroups; }

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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SignalGroupDef {
        private String name;
        private String description;
        private int startBit;
        private int bitWidth;
        private boolean isRepeating;
        private Integer repeatCount;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public int getStartBit() { return startBit; }
        public void setStartBit(int startBit) { this.startBit = startBit; }

        public int getBitWidth() { return bitWidth; }
        public void setBitWidth(int bitWidth) { this.bitWidth = bitWidth; }

        public Integer getRepeatCount() { return repeatCount; }
        public void setRepeatCount(Integer repeatCount) { this.repeatCount = repeatCount; }
    }
}
