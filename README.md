# Auto Invest Dashboard

最小構成の投資ダッシュボードです。FastAPI バックエンドと React + TypeScript フロントエンドを使用し、最適レバレッジ判断のための指標（Kelly基準、ボラティリティ、各種リスク指標）を提供します。

## 公開サイト

- GitHub Pages: https://kafka2306.github.io/auto-invest/

## 機能

- **最適レバレッジ提案**: Kelly基準とボラティリティターゲットを組み合わせた `L_blend` を提示
- **リスク分析**: 下方偏差、ソルティノ比、最大ドローダウン、ES 95%、VoV、SPX相関などを表示
- **時系列チャート**: 価格、ボラティリティ構成要素、レバレッジ推移を可視化

## クイックスタート

### 必須ツール

- `uv` (Python package manager)
- `npm` (Node.js package manager)
- `task` (Task runner)

### セットアップ & 起動

```bash
# 依存関係のインストール
task install

# 開発サーバー起動 (Backend + Frontend)
task dev

# 品質チェック (lint + typecheck)
task check
```

ブラウザで http://localhost:5173 を開きます。

### データ更新

```bash
# レバレッジ指標の計算と更新
task update
```

## アーキテクチャ

- **Backend**: FastAPI (`backend/`) - 純粋関数による指標計算サービス
- **Frontend**: React + Vite (`src/`) - 最小限のUIコンポーネント
- **Scripts**: Python (`scripts/`) - データ取得と指標更新
- **Config**: `pyproject.toml`, `Taskfile.yml` - 依存管理とタスク定義

## CI
- GitHub Actions (`.github/workflows/ci.yml`) が `ruff` → `eslint` → `tsc --noEmit` → `npm run build` を `main` 向け push / PR で実行します。

## 開発フローを最短で掴むには

- 一連のルールとツール設定を `docs/development.md` にまとめています。PR前に目を通してください。
- Codex/Claude を使う場合は `.codex/config.example.toml` を参考に個人環境へ反映するとスムーズです（APIキーは各自セット）。

## ライセンス

MIT
