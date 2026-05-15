package com.smartcharge.flink.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Signal definition loaded from the signal management tool's exported JSON.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class SignalDef {
    private String name;
    private String description;
    private int startBit;
    private int bitLength;
    private String byteOrder = "big";
    private double factor = 1.0;
    private double offset = 0.0;
    private String unit;
    private String dataType;
    private String groupName;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getStartBit() { return startBit; }
    public void setStartBit(int startBit) { this.startBit = startBit; }

    public int getBitLength() { return bitLength; }
    public void setBitLength(int bitLength) { this.bitLength = bitLength; }

    public String getByteOrder() { return byteOrder; }
    public void setByteOrder(String byteOrder) { this.byteOrder = byteOrder; }

    public double getFactor() { return factor; }
    public void setFactor(double factor) { this.factor = factor; }

    public double getOffset() { return offset; }
    public void setOffset(double offset) { this.offset = offset; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getDataType() { return dataType; }
    public void setDataType(String dataType) { this.dataType = dataType; }

    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }

    public boolean isSigned() {
        return dataType != null && dataType.startsWith("int");
    }

    @Override
    public String toString() {
        return name + "[" + startBit + ":" + bitLength + "]";
    }
}
