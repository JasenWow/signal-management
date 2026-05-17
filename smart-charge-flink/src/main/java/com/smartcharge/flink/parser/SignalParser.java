package com.smartcharge.flink.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcharge.flink.model.MessageSpec;
import com.smartcharge.flink.model.ParsedMessage;
import com.smartcharge.flink.model.SignalDef;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Parses CAN frame hex strings using signal definitions from the signal management tool.
 *
 * Bit numbering follows MSB0 convention:
 * - startBit = 0 → byte 0, MSB (bit 7 of the byte)
 * - startBit = 7 → byte 0, LSB (bit 0 of the byte)
 * - startBit = 8 → byte 1, MSB
 *
 * This class has no Flink dependencies and can be tested independently.
 */
public class SignalParser {

    private final String messageName;
    private final int frameSize;
    private final List<SignalDef> signals;
    private final Map<String, MessageSpec.SignalGroupDef> signalGroupsByName;

    public SignalParser(MessageSpec spec) {
        this.messageName = spec.getMessage().getName();
        this.frameSize = spec.getMessage().getFrameSize();
        this.signalGroupsByName = buildGroupMap(spec.getSignalGroups());
        this.signals = buildExpandedSignalList(spec.getSignals(), spec.getSignalGroups());
    }

    private Map<String, MessageSpec.SignalGroupDef> buildGroupMap(List<MessageSpec.SignalGroupDef> groups) {
        Map<String, MessageSpec.SignalGroupDef> map = new HashMap<>();
        if (groups != null) {
            for (MessageSpec.SignalGroupDef group : groups) {
                if (group.getName() != null) {
                    map.put(group.getName(), group);
                }
            }
        }
        return map;
    }

    private List<SignalDef> buildExpandedSignalList(List<SignalDef> signals, List<MessageSpec.SignalGroupDef> groups) {
        List<SignalDef> expanded = new ArrayList<>();
        for (SignalDef signal : signals) {
            String groupName = signal.getGroupName();
            if (groupName != null) {
                MessageSpec.SignalGroupDef group = signalGroupsByName.get(groupName);
                if (group != null && group.getRepeatCount() != null && group.getRepeatCount() >= 2) {
                    int repeatCount = group.getRepeatCount();
                    int bitWidth = group.getBitWidth();
                    for (int i = 1; i <= repeatCount; i++) {
                        SignalDef copy = copySignal(signal);
                        copy.setName(signal.getName() + "_" + i);
                        copy.setStartBit(signal.getStartBit() + (i - 1) * bitWidth);
                        expanded.add(copy);
                    }
                } else {
                    expanded.add(signal);
                }
            } else {
                expanded.add(signal);
            }
        }
        return expanded;
    }

    private SignalDef copySignal(SignalDef original) {
        SignalDef copy = new SignalDef();
        copy.setName(original.getName());
        copy.setDescription(original.getDescription());
        copy.setStartBit(original.getStartBit());
        copy.setBitLength(original.getBitLength());
        copy.setByteOrder(original.getByteOrder());
        copy.setFactor(original.getFactor());
        copy.setOffset(original.getOffset());
        copy.setUnit(original.getUnit());
        copy.setDataType(original.getDataType());
        copy.setGroupName(original.getGroupName());
        return copy;
    }

    public static SignalParser fromFile(String path) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        MessageSpec spec = mapper.readValue(new File(path), MessageSpec.class);
        return new SignalParser(spec);
    }

    public static SignalParser fromResource(String resourcePath) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream is = SignalParser.class.getClassLoader().getResourceAsStream(resourcePath)) {
            if (is == null) throw new IOException("Resource not found: " + resourcePath);
            MessageSpec spec = mapper.readValue(is, MessageSpec.class);
            return new SignalParser(spec);
        }
    }

    /**
     * Parse a hex string into structured signal values.
     *
     * @param hexData hex string (e.g. "0A1B2C0000000000"), case-insensitive
     * @return parsed signal values
     * @throws IllegalArgumentException if hex string is invalid or wrong length
     */
    public ParsedMessage parse(String hexData, long timestamp) {
        byte[] frame = hexToBytes(hexData);
        int expectedBytes = frameSize;
        if (frame.length != expectedBytes) {
            throw new IllegalArgumentException(
                "Frame length mismatch: expected " + expectedBytes + " bytes, got " + frame.length);
        }

        ParsedMessage result = new ParsedMessage(messageName, timestamp);
        for (SignalDef signal : signals) {
            double physicalValue = extractSignal(frame, signal);
            result.putSignal(signal.getName(), physicalValue);
        }
        return result;
    }

    public ParsedMessage parse(String hexData) {
        return parse(hexData, System.currentTimeMillis());
    }

    /**
     * Extract a single signal's physical value from the frame.
     */
    double extractSignal(byte[] frame, SignalDef signal) {
        if ("bcd_time".equals(signal.getDataType())) {
            return extractBcdTime(frame, signal.getStartBit(), signal.getBitLength());
        }

        long rawValue = extractBits(frame, signal.getStartBit(), signal.getBitLength());
        if (signal.isSigned()) {
            rawValue = signExtend(rawValue, signal.getBitLength());
        }
        return rawValue * signal.getFactor() + signal.getOffset();
    }

    /**
     * Decode BCD time code to seconds since midnight.
     *
     * BCD encodes each decimal digit in 4 bits.
     * 24-bit (3 bytes): HH MM SS → seconds since midnight
     * 32-bit (4 bytes): HH MM SS CC → seconds since midnight (CC = centiseconds as fraction)
     * Returns seconds since midnight as a double.
     */
    double extractBcdTime(byte[] frame, int startBit, int bitLength) {
        int numBytes = bitLength / 8;
        int[] bcdDigits = new int[numBytes * 2];
        int digitIdx = 0;

        for (int b = 0; b < numBytes; b++) {
            long rawByte = extractBits(frame, startBit + b * 8, 8);
            bcdDigits[digitIdx++] = (int) ((rawByte >> 4) & 0x0F); // high nibble
            bcdDigits[digitIdx++] = (int) (rawByte & 0x0F);        // low nibble
        }

        double seconds;
        if (numBytes >= 3) {
            // HH:MM:SS
            int hours = bcdDigits[0] * 10 + bcdDigits[1];
            int minutes = bcdDigits[2] * 10 + bcdDigits[3];
            int secs = bcdDigits[4] * 10 + bcdDigits[5];
            seconds = hours * 3600.0 + minutes * 60.0 + secs;

            // 4th byte: centiseconds
            if (numBytes >= 4) {
                int centis = bcdDigits[6] * 10 + bcdDigits[7];
                seconds += centis / 100.0;
            }
        } else {
            // Less than 3 bytes: treat as raw BCD value
            long value = 0;
            for (int d : bcdDigits) value = value * 10 + d;
            return value;
        }

        return seconds;
    }

    /**
     * Extract bits from a CAN frame.
     * Reads bitLength bits starting at startBit (MSB0 convention).
     */
    long extractBits(byte[] frame, int startBit, int bitLength) {
        long value = 0;
        for (int i = 0; i < bitLength; i++) {
            int absBit = startBit + i;
            int byteIdx = absBit / 8;
            int bitInByte = absBit % 8;
            // MSB0: bit 0 within a byte is the MSB (mask 0x80), bit 7 is LSB (mask 0x01)
            int bitMask = 1 << (7 - bitInByte);
            if (byteIdx < frame.length && (frame[byteIdx] & bitMask) != 0) {
                value |= (1L << (bitLength - 1 - i));
            }
        }
        return value;
    }

    /**
     * Sign-extend a raw value using two's complement.
     */
    long signExtend(long rawValue, int bitLength) {
        if ((rawValue & (1L << (bitLength - 1))) != 0) {
            rawValue -= (1L << bitLength);
        }
        return rawValue;
    }

    /**
     * Convert hex string to byte array.
     */
    static byte[] hexToBytes(String hex) {
        String cleaned = hex.replaceAll("\\s+", "");
        if (cleaned.length() % 2 != 0) {
            throw new IllegalArgumentException("Hex string must have even length: " + hex);
        }
        byte[] bytes = new byte[cleaned.length() / 2];
        for (int i = 0; i < bytes.length; i++) {
            int high = Character.digit(cleaned.charAt(i * 2), 16);
            int low = Character.digit(cleaned.charAt(i * 2 + 1), 16);
            if (high < 0 || low < 0) {
                throw new IllegalArgumentException("Invalid hex character in: " + hex);
            }
            bytes[i] = (byte) ((high << 4) | low);
        }
        return bytes;
    }

    public String getMessageName() { return messageName; }
    public int getFrameSize() { return frameSize; }
    public List<SignalDef> getSignals() { return signals; }
}
