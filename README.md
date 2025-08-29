# 自動投資パフォーマンスダッシュボード

最小構成の投資ダッシュボードです。FastAPI バックエンドと React + TypeScript フロントエンドを使い、基本的な市場データと分析指標を表示します。

## クイックスタート

### バックエンド
```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### フロントエンド
```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

## 実用例

バックエンドを起動した状態で以下を実行すると、マーケットデータの価格推移を PNG 画像として保存します。

```bash
python examples/generate_market_plot.py
```

画像は `examples/sample_market.png` に保存されます。（このリポジトリには含まれていません）

## テストとLint

```bash
npm run lint
pytest backend/tests/test_api.py
```

## ライセンス

本プロジェクトは MIT ライセンスの下で公開されています。
