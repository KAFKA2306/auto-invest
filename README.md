# Auto Invest Dashboard

最小構成の投資ダッシュボード。FastAPI + React + TypeScript で最適レバレッジ判断のための指標を提供。

## 公開サイト

https://kafka2306.github.io/auto-invest/

## 機能

- **最適レバレッジ提案**: Kelly基準とボラティリティターゲットを組み合わせた `L_blend`
- **リスク分析**: 下方偏差、ソルティノ比、最大ドローダウン、ES 95%、VoV、SPX相関
- **時系列チャート**: 価格、ボラティリティ、レバレッジ推移を可視化

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

- **Backend**: FastAPI (`backend/`)
- **Frontend**: React + Vite (`src/`)
- **Scripts**: Python (`scripts/`)
- **Config**: `pyproject.toml`, `Taskfile.yml`

## CI

GitHub Actions が lint → typecheck → build を実行。

## 開発

詳細は `docs/development.md` 参照。

## ライセンス

MIT
