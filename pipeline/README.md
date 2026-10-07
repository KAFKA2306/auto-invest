# Audit pipeline

Local OSS pipeline for Issue #12:

```text
audit event -> Apache Kafka -> Apache Spark -> Apache Iceberg
```

The pipeline is for reproducible research/audit history. It does not place brokerage orders or mutate investment accounts.
