# Auto Invest Dashboard — 投資リスク計算ダッシュボード

**公開サイト:** https://kafka2306.github.io/auto-invest/

FastAPI、React、TypeScriptで構成した投資リスク分析ダッシュボードです。市場価格の履歴からリスク指標を計算し、Kelly基準とボラティリティターゲットを組み合わせた参考レバレッジを可視化します。

計算結果は売買指示や保証値ではありません。使用した期間、頻度、計算窓、式、パラメータ、観測日が確認できない場合は、確信的な数値を表示しない設計です。

## 主な機能

### レバレッジ計算

- Kelly基準による理論値
- ボラティリティターゲットによる上限調整
- 複数方式を組み合わせた`L_blend`
- 入力不足や品質不良時の出力抑止

### リスク分析

- 年率ボラティリティ
- 下方偏差
- ソルティノ比
- 最大ドローダウン
- Expected Shortfall 95%
- Volatility of Volatility
- S&P 500との相関

### 可視化

- 価格推移
- ボラティリティ推移
- 推定レバレッジ推移
- 現在値と履歴の比較

## 計算の流れ

```text
市場価格を取得
  → 日付・頻度・欠損を検証
  → リターン系列を計算
  → リスク指標を計算
  → Kelly / ボラティリティモデルを適用
  → 制約とデータ品質を判定
  → ダッシュボードへ表示または出力を抑止
```

次の情報は別の意味として保持します。

- 市場から観測した価格
- 履歴から計算した指標
- モデルが推定した値
- 仮定を置いたシナリオ
- 利用者自身の投資判断

機械可読な定義:

- [プロジェクト・オントロジー](ontology/project.yaml)
- [共通因果・証拠オントロジー](https://github.com/KAFKA2306/know/blob/main/ontology/causal-evidence-core.yaml)

## セットアップ

```bash
task install
task dev
```

ローカル表示:

```text
http://localhost:8080
```

## データ更新

```bash
task update:all
```

## 検証

```bash
task check
```

GitHub Actionsでは、lint、型検査、フロントエンドビルドを実行します。

## 主な構成

```text
backend/        FastAPIバックエンド
src/            React + Viteフロントエンド
scripts/        データ取得・指標計算
ontology/       証拠・計算・判断モデル
pyproject.toml  Python依存関係
taskfile.yml    実行タスク
```

詳細は[開発ドキュメント](docs/development.md)を参照してください。

## 注意

- Kelly基準は入力した期待収益と分散へ強く依存します
- 過去のリターン分布が将来も続くことを保証しません
- レバレッジは損失と強制決済の危険を増幅します
- 市場データの取得元、観測日、調整方法を確認してください
- 本プロジェクトは投資助言や売買推奨ではありません

## ライセンス

MIT

**README最終監査:** 2026-08-01
