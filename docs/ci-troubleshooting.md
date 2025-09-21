# GitHub Actions CI トラブルシューティング記録

## 問題概要

Financial Analysis Pipelineワークフローが連続で失敗していた問題の調査・解決記録

## 発生した問題

### 症状
- GitHub Actions上で`Run financial analysis pipeline`ステップが失敗
- ローカル環境では正常動作
- エラーメッセージが不明瞭

### 失敗パターン
1. **初回**: Playwrightブラウザ初期化エラー
2. **修正後**: 引き続き同じステップで失敗
3. **代替案実装後**: まだ失敗継続

## 調査過程

### 1. 環境差異の特定

**ローカル環境**
```bash
# 正常動作確認
cd scripts && node run-financial-analysis.js
# ✅ 完全に動作

# CI環境の模擬
CI=true NODE_ENV=production node run-financial-analysis.js
# ✅ 正常動作
```

**CI環境との差異**
- Node.js バージョン: ローカル v22.18.0 vs CI v18
- 権限設定
- ネットワーク制限
- ファイルシステムの違い

### 2. 段階的テスト実装

**test-ci.js作成**
- 基本モジュール読み込み
- 外部パッケージ（JSDOM）
- fetch機能
- ファイルシステム操作
- 実際のモジュール読み込み

**発見された問題**
```javascript
// ❌ 間違った方法
const fs = await import('fs');
await fs.mkdir(dir); // TypeError: cb is not a function

// ✅ 正しい方法
const fs = await import('fs/promises');
await fs.mkdir(dir); // 正常動作
```

### 3. デバッグ強化

**実装した改善**
- 詳細な環境変数ログ出力
- ステップごとの成功/失敗確認
- エラー時のフォールバック情報収集
- 動的モジュール読み込みの検証

## 解決策

### 1. Playwrightの代替案

**CI専用のHeadlessスクレイパー**
```javascript
// Playwright不要のシンプル実装
class FinancialScraperHeadless {
  async fetchPage(url) {
    const response = await fetch(url, {
      headers: CONFIG.request.headers
    });
    return await response.text();
  }

  parseArticles(html, siteConfig) {
    const dom = new JSDOM(html);
    // JSDOM only - ブラウザ不要
  }
}
```

### 2. 環境別実行

```javascript
// 環境を自動検出して適切なスクレイパーを選択
const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'production';
const scraper = isCI ? new FinancialScraperHeadless() : new FinancialScraper();
```

### 3. ワークフロー改善

```yaml
# 段階的なPlaywrightインストール
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps chromium

# 詳細デバッグ情報
- name: Run financial analysis pipeline
  run: |
    echo "Environment: NODE_ENV=$NODE_ENV, CI=$CI"
    node run-financial-analysis.js 2>&1 || {
      echo "Pipeline failed, debugging..."
      node -e "console.log('Node.js test OK')"
      exit 1
    }
  env:
    NODE_ENV: production
    CI: true
```

## 学んだ教訓

### 1. CI環境の特性
- **ネットワーク制限**: 外部サイトアクセスの制約
- **リソース制限**: メモリ・CPU制限
- **権限制限**: ファイルシステムアクセス
- **タイムアウト**: 長時間実行の制限

### 2. デバッグ戦略
- **段階的テスト**: 小さな機能から徐々に拡張
- **環境模擬**: ローカルでCI環境を再現
- **詳細ログ**: 失敗箇所の特定
- **代替案準備**: 依存関係の最小化

### 3. 実装のベストプラクティス
- **環境依存性の最小化**: 重いパッケージの代替案
- **適応型設計**: 環境に応じた動作変更
- **包括的エラーハンドリング**: 予期しない失敗への対応

## 今後の改善案

### 1. より堅牢なCI設計
- **Docker化**: 環境の完全制御
- **ローカルCI**: GitHub Actions Runnerのローカル実行
- **段階的デプロイ**: 開発→ステージング→本番

### 2. 監視・アラート
- **失敗通知**: Slackやメール通知
- **メトリクス収集**: 実行時間・成功率の追跡
- **自動復旧**: 一時的な失敗の自動リトライ

### 3. 依存関係管理
- **軽量化**: 必要最小限のパッケージ
- **互換性確保**: 複数Node.jsバージョンでのテスト
- **セキュリティ**: 定期的な依存関係更新

## まとめ

CI環境でのトラブルシューティングは以下の手順で効率的に解決可能：

1. **問題の分離**: ローカル vs CI での動作差異を特定
2. **段階的デバッグ**: 最小機能から徐々に拡張してテスト
3. **代替案実装**: 重い依存関係の軽量化
4. **詳細ログ**: 失敗箇所の正確な特定
5. **環境適応**: CI/CD環境に最適化された実装

この記録により、今後同様の問題が発生した際の迅速な解決が可能になる。