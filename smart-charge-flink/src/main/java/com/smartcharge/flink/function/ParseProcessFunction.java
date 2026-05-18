package com.smartcharge.flink.function;

import com.smartcharge.flink.model.ParsedMessage;
import com.smartcharge.flink.model.RawMessage;
import com.smartcharge.flink.parser.SignalParser;
import org.apache.flink.streaming.api.functions.ProcessFunction;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;

/**
 * Flink ProcessFunction that parses raw hex strings into structured signal values.
 * Emits parsed results on the main output and raw messages on a side output.
 */
public class ParseProcessFunction extends ProcessFunction<String, ParsedMessage> {

    public static final OutputTag<RawMessage> RAW_OUTPUT = new OutputTag<RawMessage>("raw") {};

    private final SignalParser parser;

    public ParseProcessFunction(SignalParser parser) {
        this.parser = parser;
    }

    @Override
    public void processElement(String hexData, Context ctx, Collector<ParsedMessage> out) {
        long timestamp = ctx.timestamp() != null ? ctx.timestamp() : System.currentTimeMillis();

        // Side output: raw message
        RawMessage raw = new RawMessage(parser.getMessageName(), hexData.trim(), timestamp);
        ctx.output(RAW_OUTPUT, raw);

        // Main output: parsed message
        try {
            ParsedMessage parsed = parser.parse(hexData.trim(), timestamp);
            out.collect(parsed);
        } catch (Exception e) {
            System.err.println("Failed to parse frame: " + hexData + " — " + e.getMessage());
        }
    }
}
