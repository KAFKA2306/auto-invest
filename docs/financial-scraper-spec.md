# Financial Scraper - 仕様書

## プロジェクト概要

金融情報サイトから記事を自動収集し、キーワード分析・感情分析を行うシステム

## 技術仕様

### 対象サイト
- 神宮前マクロ (https://www.shenmacro.com) - メインターゲット
- 日経電子版 - 比較用（無料記事のみ）
- ロイター - 海外情報補完

### データ構造
```json
{
  "timestamp": "2025-09-21T12:00:00Z",
  "articles": [
    {
      "id": "hash",
      "title": "記事タイトル",
      "date": "2025-09-21",
      "source": "神宮前マクロ",
      "url": "記事URL",
      "keywords": ["S&P500", "FRB"],
      "sentiment": 0.2,
      "priority": "high"
    }
  ],
  "summary": {
    "total_articles": 5,
    "sentiment_average": 0.1,
    "top_keywords": ["S&P500", "利下げ"]
  }
}
```

### ファイル構成
```
scripts/
├── financial-scraper.js       # メインスクレイピング
├── scraper-config.js         # 設定管理
└── scraper-utils.js          # 共通ユーティリティ

public/data/financial/
├── daily-articles.json       # 日次記事データ
├── keywords-trend.json       # キーワードトレンド
└── sentiment-analysis.json   # 感情分析結果
```

## 実装制約

### 技術的制約
- robots.txt準拠
- レート制限: 1秒間隔
- 3回リトライ後スキップ
- メモリ使用量制御

### 法的制約
- 公開情報のみ取得
- 利用規約遵守
- データ保持期間: 90日

## キーワード辞書

### 高優先度
- S&P500, FRB, FOMC, 利下げ, 利上げ

### 中優先度
- インフレ, GDP, 中国経済, ドル円

### 低優先度
- 株価, 市場, 経済指標

## 感情分析

### ポジティブ語
- 上昇, 回復, 好調, 期待

### ネガティブ語
- 下落, 懸念, リスク, 警戒

### 中立語
- 維持, 横ばい, 推移