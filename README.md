# Auto Invest Dashboard

最小構成の投資ダッシュボード。FastAPI + React + TypeScriptで、レバレッジ判断に関係する計算値とリスク指標を可視化します。

## 公開サイト

https://kafka2306.github.io/auto-invest/

## 因果・証拠オントロジー

上位システムは `PortfolioRiskCalculationSystem` です。

```text
市場価格の観測
→ リターン系列
→ リスク指標の計算
→ モデルによるレバレッジ推定
→ データ品質・制約判定
→ 表示または出力抑止
```

市場観測、履歴計算、モデル推定、シナリオ、ユーザー判断を別の意味クラスとして扱います。Kelly基準やボラティリティターゲットの出力は保証値ではありません。出典、期間、頻度、計算窓、式、パラメータ、as-of日付が欠ける場合は `UNKNOWN` とし、確信的なレバレッジ出力を抑止します。

- [プロジェクト・オントロジー](ontology/project.yaml)
- [共通因果・証拠オントロジー](https://github.com/KAFKA2306/know/blob/main/ontology/causal-evidence-core.yaml)

## 機能

- **レバレッジ計算**: Kelly基準とボラティリティターゲットを組み合わせた `L_blend`
- **リスク分析**: 下方偏差、ソルティノ比、最大ドローダウン、ES 95%、VoV、SPX相関
- **時系列チャート**: 価格、ボラティリティ、レバレッジ推移

## セットアップ

```bash
task install
task dev
task check
```

ブラウザで http://localhost:8080

## データ更新

```bash
task update:all
```

## アーキテクチャ

- Backend: FastAPI (`backend/`)
- Frontend: React + Vite (`src/`)
- Scripts: Python (`scripts/`)
- Config: `pyproject.toml`, `Taskfile.yml`

## CI

GitHub Actionsがlint、typecheck、buildを実行します。

詳細は `docs/development.md` を参照してください。

## ライセンス

MIT