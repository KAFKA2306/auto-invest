from __future__ import annotations

import argparse
import json

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    DoubleType,
    IntegerType,
    StringType,
    StructField,
    StructType,
)

from policy import ALLOWED_ENVIRONMENTS, ALLOWED_STAGES


EVENT_SCHEMA = StructType(
    [
        StructField("event_id", StringType(), False),
        StructField("run_id", StringType(), False),
        StructField("event_seq", IntegerType(), False),
        StructField("event_time", StringType(), False),
        StructField("stage", StringType(), False),
        StructField("strategy_version", StringType(), False),
        StructField("symbol", StringType(), False),
        StructField("execution_environment", StringType(), False),
        StructField("source_kind", StringType(), False),
        StructField("broker_event_id", StringType(), True),
        StructField("observed_data_ref", StringType(), False),
        StructField("commission_bps", DoubleType(), True),
        StructField("spread_bps", DoubleType(), True),
        StructField("slippage_bps", DoubleType(), True),
        StructField("tax_bps", DoubleType(), True),
        StructField("payload_json", StringType(), False),
    ]
)

TABLE = "audit.research.execution_events"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap-servers", default="kafka:9092")
    parser.add_argument("--topic", default="audit-events")
    parser.add_argument("--expected-rows", type=int, default=5)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    spark = SparkSession.builder.appName("auto-invest-audit").getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    raw = (
        spark.read.format("kafka")
        .option("kafka.bootstrap.servers", args.bootstrap_servers)
        .option("subscribe", args.topic)
        .option("startingOffsets", "earliest")
        .option("endingOffsets", "latest")
        .load()
    )

    events = (
        raw.select(F.from_json(F.col("value").cast("string"), EVENT_SCHEMA).alias("event"))
        .select("event.*")
        .withColumn("event_time", F.to_timestamp("event_time"))
    )

    invalid = events.filter(
        F.col("event_id").isNull()
        | F.col("run_id").isNull()
        | F.col("event_seq").isNull()
        | F.col("event_time").isNull()
        | ~F.col("stage").isin(sorted(ALLOWED_STAGES))
        | ~F.col("execution_environment").isin(sorted(ALLOWED_ENVIRONMENTS))
        | (
            (F.col("stage") == "fill")
            & (F.col("execution_environment") == "live")
            & (
                (F.col("source_kind") != "broker_observation")
                | F.col("broker_event_id").isNull()
                | (F.length(F.trim(F.col("broker_event_id"))) == 0)
            )
        )
        | (F.coalesce(F.col("commission_bps"), F.lit(0.0)) < 0)
        | (F.coalesce(F.col("spread_bps"), F.lit(0.0)) < 0)
        | (F.coalesce(F.col("slippage_bps"), F.lit(0.0)) < 0)
        | (F.coalesce(F.col("tax_bps"), F.lit(0.0)) < 0)
    )
    if invalid.limit(1).count():
        invalid.show(truncate=False)
        raise RuntimeError("audit event validation failed")

    duplicates = events.groupBy("event_id").count().filter(F.col("count") > 1)
    if duplicates.limit(1).count():
        duplicates.show(truncate=False)
        raise RuntimeError("duplicate event_id detected")

    spark.sql("CREATE NAMESPACE IF NOT EXISTS audit.research")
    spark.sql(
        f"""
        CREATE TABLE IF NOT EXISTS {TABLE} (
            event_id STRING NOT NULL,
            run_id STRING NOT NULL,
            event_seq INT NOT NULL,
            event_time TIMESTAMP NOT NULL,
            stage STRING NOT NULL,
            strategy_version STRING NOT NULL,
            symbol STRING NOT NULL,
            execution_environment STRING NOT NULL,
            source_kind STRING NOT NULL,
            broker_event_id STRING,
            observed_data_ref STRING NOT NULL,
            commission_bps DOUBLE,
            spread_bps DOUBLE,
            slippage_bps DOUBLE,
            tax_bps DOUBLE,
            payload_json STRING NOT NULL
        )
        USING iceberg
        PARTITIONED BY (days(event_time))
        TBLPROPERTIES ('format-version'='2')
        """
    )

    ordered = events.orderBy("run_id", "event_seq")
    ordered.writeTo(TABLE).append()

    persisted = spark.table(TABLE)
    row_count = persisted.count()
    stages = [row["stage"] for row in persisted.select("stage").distinct().orderBy("stage").collect()]
    expected_stages = sorted(ALLOWED_STAGES)

    if row_count != args.expected_rows:
        raise RuntimeError(f"expected {args.expected_rows} rows, got {row_count}")
    if stages != expected_stages:
        raise RuntimeError(f"expected stages {expected_stages}, got {stages}")

    snapshots = spark.sql(
        "SELECT snapshot_id, operation FROM audit.research.execution_events.snapshots"
    ).collect()
    if not snapshots:
        raise RuntimeError("Iceberg table has no snapshot")

    result = {
        "rows": row_count,
        "stages": stages,
        "iceberg_snapshots": len(snapshots),
        "table": TABLE,
    }
    print("AUDIT_PIPELINE_OK " + json.dumps(result, sort_keys=True))
    spark.stop()


if __name__ == "__main__":
    main()
