# Audit pipeline

Issue #12 の「検証可能な投資ルールと実行履歴」を、ローカルOSSだけで保存する経路です。

```text
signal / order / fill / position / performance
  -> Apache Kafka 4.3.1
  -> Apache Spark 4.1.3
  -> Apache Iceberg 1.12.0
```

Kafkaは監査イベントの入口、Sparkはschema・安全条件・重複を検証する処理層、Icebergは履歴テーブルです。既存のReactダッシュボードや `public/data/*.json` を正本から外しません。

## Safety boundary

- `backtest` のfillは `source_kind=simulator` として明示できます。
- `live` のfillは `source_kind=broker_observation` かつ `broker_event_id` が必須です。
- live fillを推測やsilent fallbackで生成しません。
- このpipeline自体は注文送信、口座操作、リバランスを行いません。

## Local verification

```bash
task audit:check
```

CIも同じ順序でKafkaを起動し、固定fixtureをpublishし、Sparkで読み、Iceberg tableへappendした後にIceberg snapshotをread-backします。
