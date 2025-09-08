# 自動投資パフォーマンスダッシュボード

最小構成の投資ダッシュボードです。FastAPI バックエンドと React + TypeScript フロントエンドを使い、基本的な市場データと分析指標を表示します。

GitHub Actions と GitHub Pages による全自動ワークフローも用意されており、定期的に市場データを取得して分析結果を `public/data/metrics.json` に保存し、静的サイトを自動デプロイします。
さらに最新の GitHub Actions の実行状況も `public/data/actions.json` に書き出され、ダッシュボード上で確認できます。

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

## 不動産デベロッパー監視YAML

不動産デベロッパーの監視データを `public/data/real_estate_watch.yaml` に追加しました。スプレッドシートで扱いやすい CSV に変換するには次を実行します。

```bash
python examples/real_estate_yaml_to_csv.py
```

`public/data/real_estate_watch.csv` が生成され、YAML の内容がテーブル形式で出力されます。

## テストとLint

```bash
npm run lint
pytest backend/tests/test_api.py
```

## ライセンス

本プロジェクトは MIT ライセンスの下で公開されています。
