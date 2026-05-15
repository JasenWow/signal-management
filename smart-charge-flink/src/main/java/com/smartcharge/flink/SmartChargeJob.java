package com.smartcharge.flink;

import com.smartcharge.flink.function.ParseProcessFunction;
import com.smartcharge.flink.model.ParsedMessage;
import com.smartcharge.flink.model.RawMessage;
import com.smartcharge.flink.parser.SignalParser;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.source.FileProcessingMode;
import org.apache.flink.table.api.DataTypes;
import org.apache.flink.table.api.Schema;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.TableResult;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;

import java.util.Map;

/**
 * Flink job that reads CAN frame hex strings, parses them using signal definitions,
 * and writes both raw data and parsed results to Parquet tables.
 *
 * Usage:
 *   --spec <path-to-spec-json> --input <path-to-input-dir> --output <path-to-output-dir>
 *
 * Input: a directory of text files, one hex string per line.
 * Output: two Parquet directories under the output path:
 *   - raw/     — original hex data with metadata
 *   - parsed/  — extracted signal values
 */
public class SmartChargeJob {

    public static void main(String[] args) throws Exception {
        String specPath = getArg(args, "--spec", "spec.json");
        String inputPath = getArg(args, "--input", "input");
        String outputPath = getArg(args, "--output", "output");

        SignalParser parser = SignalParser.fromFile(specPath);

        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        StreamTableEnvironment tEnv = StreamTableEnvironment.create(env);

        // Source: read hex strings from files (one per line)
        DataStream<String> hexStream = env.readTextFile(inputPath);

        // Process: parse hex strings, side-output raw data
        SingleOutputStreamOperator<ParsedMessage> parsedStream = hexStream
            .process(new ParseProcessFunction(parser));

        DataStream<RawMessage> rawStream = parsedStream.getSideOutput(ParseProcessFunction.RAW_OUTPUT);

        // Register raw table
        Table rawTable = tEnv.fromDataStream(rawStream, Schema.newBuilder()
            .column("id", DataTypes.STRING())
            .column("messageName", DataTypes.STRING())
            .column("hexData", DataTypes.STRING())
            .column("timestamp", DataTypes.BIGINT())
            .build());

        tEnv.createTemporaryView("raw_messages", rawTable);

        // Register parsed table
        Table parsedTable = tEnv.fromDataStream(parsedStream, Schema.newBuilder()
            .column("id", DataTypes.STRING())
            .column("messageName", DataTypes.STRING())
            .column("timestamp", DataTypes.BIGINT())
            .column("signals", DataTypes.MAP(DataTypes.STRING(), DataTypes.DOUBLE()))
            .build());

        tEnv.createTemporaryView("parsed_messages", parsedTable);

        // Create Parquet sink tables
        tEnv.executeSql("CREATE TABLE raw_sink (" +
            "  id STRING," +
            "  messageName STRING," +
            "  hexData STRING," +
            "  `timestamp` BIGINT" +
            ") WITH (" +
            "  'connector' = 'filesystem'," +
            "  'path' = '" + outputPath + "/raw'," +
            "  'format' = 'parquet'" +
            ")");

        tEnv.executeSql("CREATE TABLE parsed_sink (" +
            "  id STRING," +
            "  messageName STRING," +
            "  `timestamp` BIGINT," +
            "  signals MAP<STRING, DOUBLE>" +
            ") WITH (" +
            "  'connector' = 'filesystem'," +
            "  'path' = '" + outputPath + "/parsed'," +
            "  'format' = 'parquet'" +
            ")");

        // Execute inserts
        TableResult rawInsert = tEnv.executeSql("INSERT INTO raw_sink SELECT * FROM raw_messages");
        TableResult parsedInsert = tEnv.executeSql("INSERT INTO parsed_sink SELECT * FROM parsed_messages");

        parsedInsert.await();
    }

    private static String getArg(String[] args, String flag, String defaultVal) {
        for (int i = 0; i < args.length - 1; i++) {
            if (flag.equals(args[i])) return args[i + 1];
        }
        return defaultVal;
    }
}
