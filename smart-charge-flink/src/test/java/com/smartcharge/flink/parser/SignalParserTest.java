package com.smartcharge.flink.parser;

import com.smartcharge.flink.model.ParsedMessage;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SignalParserTest {

    static SignalParser parser;

    @BeforeAll
    static void setUp() throws Exception {
        parser = SignalParser.fromResource("test-spec.json");
    }

    @Test
    void parsesFullFrame() {
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
        ParsedMessage result = parser.parse("0000FF0000000000");
        assertEquals(-41.0, result.getSignals().get("CoolantTemp"), 0.001);
    }

    @Test
    void extractsSingleBit() {
        ParsedMessage resultOff = parser.parse("0FA0412EE0000000");
        assertEquals(0.0, resultOff.getSignals().get("IsRunning"), 0.001);

        ParsedMessage resultOn = parser.parse("0FA0412EE0800000");
        assertEquals(1.0, resultOn.getSignals().get("IsRunning"), 0.001);
    }

    @Test
    void extractsMultiBitWithinByte() {
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
        long result = parser.signExtend(65, 8);
        assertEquals(65, result);
    }

    @Test
    void signExtendNegativeValue() {
        long result = parser.signExtend(0xFF, 8);
        assertEquals(-1, result);
    }

    @Test
    void signExtend16BitNegative() {
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
        byte[] frame = SignalParser.hexToBytes("143045");
        double result = parser.extractBcdTime(frame, 0, 24);
        assertEquals(52245.0, result, 0.001);
    }

    @Test
    void bcdTimeDecodes32Bit() {
        byte[] frame = SignalParser.hexToBytes("14304567");
        double result = parser.extractBcdTime(frame, 0, 32);
        assertEquals(52245.67, result, 0.001);
    }

    @Test
    void bcdTimeMidnight() {
        byte[] frame = SignalParser.hexToBytes("000000");
        double result = parser.extractBcdTime(frame, 0, 24);
        assertEquals(0.0, result, 0.001);
    }

    @Test
    void bcdTimeWithOffset() {
        byte[] frame = SignalParser.hexToBytes("00143045");
        double result = parser.extractBcdTime(frame, 8, 24);
        assertEquals(52245.0, result, 0.001);
    }
}
