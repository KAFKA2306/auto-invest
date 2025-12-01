# Scripts

金融データ取得・計算スクリプト群。

## 実行

```bash
task update:all
```

## ファイル構成

- `update_leverage.py`: レバレッジメトリクス計算
- `update_valuation.py`: バリュエーション計算
- `update_eps.py`: ボトムアップEPS計算
- `lib/`: 共通ライブラリ
  - `config.py`: 設定ローダー
  - `data.py`: データI/O
  - `math.py`: 計算ロジック

## 設定

全定数は `config.yaml` で管理。

## 実装方針

- エラーハンドリング禁止（失敗時はクラッシュ）
- コメント禁止
- ハードコード禁止（設定は `config.yaml` で指定）