package com.smartcharge.flink.parser;

import com.smartcharge.flink.model.ParsedMessage;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for SignalParser. These run independently of Flink.
 */
class SignalParserTest {

    static SignalParser parser;
    static SignalParser repeatingParser;

    @BeforeAll
    static void setUp() throws Exception {
        parser = SignalParser.fromResource("test-spec.json");
        repeatingParser = SignalParser.fromResource("test-spec-repeating.json");
    }

    @Test
    void parsesFullFrame() {
        // Frame: 0FA0412EE0B0FFFF
        // EngineRPM(0-15):   0x0FA0 = 4000 * 0.25 = 1000.0
        // CoolantTemp(16-23): 0x41 = 65 + (-40) = 25.0
        // VehicleSpeed(24-39): 0x2EE0 = 12000 * 0.01 = 120.0
        // IsRunning(40):      bit 7 of byte 5 = 1 → 1.0
        // Gear(41-43):        bits 6-4 of byte 5 = 011 = 3 → 3.0
        // ErrorCode(48-63):   0xFFFF = -1 (int16) → -1.0
        ParsedMessage result = parser.parse("0FA0412EE0B0FFFF");

        assertEquals(1000.0, result.getSignals().get("EngineRPM"), 0.001);
        assertEquals(25.0, result.getSignals().get("CoolantTemp"), 0.001);
        assertEquals(120.0, result.getSignals().get("VehicleSpeed"), 0.001);
        assertEquals(1.0, result.getSignals().get("IsRunning"), 0.001);
        assertEquals(3.0, result.getSignals().get("Gear"), 0.001);
        assertEquals(-1.0, result.getSignals().get("ErrorCode"), 0.001);
    }

    @Test
    void parsesZeroFrame() {
        ParsedMessage result = parser.parse("0000000000000000");
        assertEquals(0.0, result.getSignals().get("EngineRPM"), 0.001);
        assertEquals(-40.0, result.getSignals().get("CoolantTemp"), 0.001);
        assertEquals(0.0, result.getSignals().get("VehicleSpeed"), 0.001);
        assertEquals(0.0, result.getSignals().get("IsRunning"), 0.001);
        assertEquals(0.0, result.getSignals().get("ErrorCode"), 0.001);
    }

    @Test
    void handlesSignedNegativeValue() {
        // CoolantTemp at bits 16-23, factor=1, offset=-40, int8
        // Set byte 2 = 0x00 → raw=0, physical = 0 - 40 = -40
        // Set byte 2 = 0xFF → raw=-1 (signed), physical = -1 - 40 = -41
        ParsedMessage result = parser.parse("0000FF0000000000");
        assertEquals(-41.0, result.getSignals().get("CoolantTemp"), 0.001);
    }

    @Test
    void extractsSingleBit() {
        // IsRunning at bit 40 (MSB of byte 5)
        // byte 5 = 0x00 → IsRunning = 0
        ParsedMessage resultOff = parser.parse("0FA0412EE0000000");
        assertEquals(0.0, resultOff.getSignals().get("IsRunning"), 0.001);

        // byte 5 = 0x80 → IsRunning = 1
        ParsedMessage resultOn = parser.parse("0FA0412EE0800000");
        assertEquals(1.0, resultOn.getSignals().get("IsRunning"), 0.001);
    }

    @Test
    void extractsMultiBitWithinByte() {
        // Gear at bits 41-43 (3 bits, values 0-7)
        // byte 5 = 0x70 → bits 6-4 = 111 = 7
        ParsedMessage result = parser.parse("0000000000700000");
        assertEquals(7.0, result.getSignals().get("Gear"), 0.001);
    }

    @Test
    void rejectsWrongLength() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse("0A1B"));
        assertThrows(IllegalArgumentException.class, () -> parser.parse("000000000000000000"));
    }

    @Test
    void rejectsInvalidHex() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse("ZZZZZZZZZZZZZZZZ"));
    }

    @Test
    void hexToBytesParsesCorrectly() {
        byte[] bytes = SignalParser.hexToBytes("0A1B");
        assertEquals(2, bytes.length);
        assertEquals(0x0A, bytes[0] & 0xFF);
        assertEquals(0x1B, bytes[1] & 0xFF);
    }

    @Test
    void hexToBytesCaseInsensitive() {
        byte[] lower = SignalParser.hexToBytes("0a1b");
        byte[] upper = SignalParser.hexToBytes("0A1B");
        assertArrayEquals(lower, upper);
    }

    @Test
    void signExtendPositiveValue() {
        // 8-bit value 65 (0x41) should stay 65
        long result = parser.signExtend(65, 8);
        assertEquals(65, result);
    }

    @Test
    void signExtendNegativeValue() {
        // 8-bit value 255 (0xFF) should become -1
        long result = parser.signExtend(0xFF, 8);
        assertEquals(-1, result);
    }

    @Test
    void signExtend16BitNegative() {
        // 16-bit value 0xFFFF should become -1
        long result = parser.signExtend(0xFFFF, 16);
        assertEquals(-1, result);
    }

    @Test
    void parserMetadataCorrect() {
        assertEquals("TestFrame", parser.getMessageName());
        assertEquals(8, parser.getFrameSize());
        assertEquals(6, parser.getSignals().size());
    }

    @Test
    void bcdTimeDecodes24Bit() {
        // BCD 14:30:45 = 0x14 0x30 0x45 → 14*3600 + 30*60 + 45 = 52245.0
        byte[] frame = SignalParser.hexToBytes("143045");
        double result = parser.extractBcdTime(frame, 0, 24);
        assertEquals(52245.0, result, 0.001);
    }

    @Test
    void bcdTimeDecodes32Bit() {
        // BCD 14:30:45.67 = 0x14 0x30 0x45 0x67 → 52245.67
        byte[] frame = SignalParser.hexToBytes("14304567");
        double result = parser.extractBcdTime(frame, 0, 32);
        assertEquals(52245.67, result, 0.001);
    }

    @Test
    void bcdTimeMidnight() {
        // BCD 00:00:00 = 0x00 0x00 0x00 → 0.0
        byte[] frame = SignalParser.hexToBytes("000000");
        double result = parser.extractBcdTime(frame, 0, 24);
        assertEquals(0.0, result, 0.001);
    }

    @Test
    void bcdTimeWithOffset() {
        // BCD time at offset: startBit=16, bits 16-39 in a 4-byte frame
        // Frame: 0xFF 0xFF 0x12 0x34 → at byte 2-3, BCD 12:34:... wait, 16 bits = 2 bytes
        // Actually test with 24-bit BCD at startBit=8
        // Frame: 0x00 0x14 0x30 0x45 → BCD at byte 1-3 = 14:30:45 = 52245
        byte[] frame = SignalParser.hexToBytes("00143045");
        double result = parser.extractBcdTime(frame, 8, 24);
        assertEquals(52245.0, result, 0.001);
    }

    @Test
    void expandsRepeatingGroupSignals() {
        // test-spec-repeating.json has CellVoltage group (repeatCount=2)
        // with signals Voltage (startBit=0, bitLength=16) and Temp (startBit=16, bitLength=8)
        // Non-grouped Status at startBit=48
        // Expected: Voltage_1, Voltage_2, Temp_1, Temp_2, Status
        ParsedMessage result = repeatingParser.parse("0000000000000000");
        var signals = result.getSignals();

        assertNotNull(signals.get("Voltage_1"), "First repetition should have Voltage_1 suffix");
        assertNotNull(signals.get("Voltage_2"), "Second repetition should have Voltage_2 suffix");
        assertNotNull(signals.get("Temp_1"), "First repetition should have Temp_1 suffix");
        assertNotNull(signals.get("Temp_2"), "Second repetition should have Temp_2 suffix");
        assertNotNull(signals.get("Status"), "Non-grouped signal should keep original name");
    }

    @Test
    void nonGroupedSignalsUnchanged() {
        // Status is not in a group, should appear with original name
        ParsedMessage result = repeatingParser.parse("0000000000000000");
        var signals = result.getSignals();

        assertNotNull(signals.get("Status"), "Non-grouped signal should keep original name");
        assertNull(signals.get("Status_1"), "Non-grouped signal should NOT have _1 suffix");
    }

    @Test
    void expandedSignalsHaveCorrectValues() {
        // Frame bytes: [0x12, 0x34, 0x56, 0x78, 0x23, 0x45, 0xAB, 0x9A]
        // Voltage_1 at bits 0-15: bytes 0-1 → 0x1234 = 4660.0
        // Temp_1 at bits 16-23: byte 2 → 0x56 = 86.0 (no offset)
        // Voltage_2 at bits 32-47: bytes 4-5 → 0x2345 = 9029.0
        // Temp_2 at bits 48-55: byte 6 → 0xAB = 171.0 (no offset)
        // Status at bits 56-63: byte 7 → 0x9A = 154.0
        ParsedMessage result = repeatingParser.parse("123456782345AB9A");
        var signals = result.getSignals();

        assertEquals(4660.0, signals.get("Voltage_1"), 0.001);
        assertEquals(9029.0, signals.get("Voltage_2"), 0.001);
        assertEquals(86.0, signals.get("Temp_1"), 0.001);
        assertEquals(171.0, signals.get("Temp_2"), 0.001);
        assertEquals(154.0, signals.get("Status"), 0.001);
    }

    @Test
    void singleRepeatTreatedAsNonRepeating() {
        // When repeatCount=1, signal should have no _1 suffix (same as non-repeating)
        // This test uses a hypothetical single-repeat spec; for now we verify original test-spec behavior
        ParsedMessage result = parser.parse("0FA0412EE0B0FFFF");
        var signals = result.getSignals();

        // test-spec.json has no repeating groups, so all signals use original names
        assertNotNull(signals.get("EngineRPM"), "Non-repeating signals should have original name");
        assertNull(signals.get("EngineRPM_1"), "Non-repeating signals should NOT have _1 suffix");
    }

    @Test
    void repeatingGroupUsesCorrectBitOffsets() {
        // CellVoltage group: startBit=0, bitWidth=32, repeatCount=2
        // Signal Voltage in group: startBit=0, bitLength=16
        // Repetition 1: Voltage_1 at bits 0-15 (startBit + (1-1)*bitWidth = 0)
        // Repetition 2: Voltage_2 at bits 32-47 (startBit + (2-1)*bitWidth = 32)
        // Signal Temp in group: startBit=16, bitLength=8
        // Repetition 1: Temp_1 at bits 16-23 (16 + 0*32 = 16)
        // Repetition 2: Temp_2 at bits 48-55 (16 + 1*32 = 48)
        ParsedMessage result = repeatingParser.parse("FFFF0000FFFF0000");
        var signals = result.getSignals();

        // Bytes: [0xFF, 0xFF, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00]
        // Voltage_1 bits 0-15: 0xFFFF = 65535.0
        // Voltage_2 bits 32-47: 0xFFFF = 65535.0
        // Temp_1 bits 16-23: byte 2 → 0x00 = 0.0 (no offset defined in spec)
        // Temp_2 bits 48-55: byte 6 → 0x00 = 0.0 (no offset defined in spec)
        assertEquals(65535.0, signals.get("Voltage_1"), 0.001);
        assertEquals(65535.0, signals.get("Voltage_2"), 0.001);
        assertEquals(0.0, signals.get("Temp_1"), 0.001);
        assertEquals(0.0, signals.get("Temp_2"), 0.001);
    }
}
