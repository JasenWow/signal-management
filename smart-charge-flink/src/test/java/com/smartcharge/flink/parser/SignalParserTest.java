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

    @BeforeAll
    static void setUp() throws Exception {
        parser = SignalParser.fromResource("test-spec.json");
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
}
