# Static Fallback Contract

KAFKA の全フロントエンドは以下の3層でデータを扱います。

### ① API

`/api/...`

### ② static fallback

`public/data/xxx.json`

### ③ UI

React で描画

この3層が形成する「契約 (contract)」を文書化し、フロントエンド、バックエンド、およびデータ生成スクリプト間の責務を明確にします。

## public/data/metrics.json

*   API が落ちたときの fallback として機能します。
*   スキーマはバックエンドの `/leverage` エンドポイントのレスポンスと同一である必要があります。
*   CI (Continuous Integration) が push 時にスキーマバリデーションを実行し、整合性を検証します。

## public/data/valuation.json

*   API が落ちたときの fallback として機能します。
*   スキーマはバックエンドの `/valuation` エンドポイントのレスポンスと同一である必要があります。
*   CI (Continuous Integration) が push 時にスキーマバリデーションを実行し、整合性を検証します。