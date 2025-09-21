// Financial Scraper Configuration
export const CONFIG = {
  // Target sites configuration
  sites: {
    shenmacro: {
      name: '神宮前マクロ',
      url: 'https://www.shenmacro.com',
      robotsUrl: 'https://www.shenmacro.com/robots.txt',
      selectors: {
        articles: '.entry-title a',
        title: '.entry-title',
        date: '.entry-date',
        content: '.entry-content'
      },
      rateLimit: 1000, // 1 second between requests
      maxRetries: 3
    }
  },

  // Keywords dictionary with priority levels
  keywords: {
    high: ['S&P500', 'FRB', 'FOMC', '利下げ', '利上げ', 'インフレ', 'CPI'],
    medium: ['GDP', '中国経済', 'ドル円', '日銀', 'ECB', 'テスラ', 'ナスダック'],
    low: ['株価', '市場', '経済指標', '決算', '業績', 'IPO']
  },

  // Sentiment analysis dictionaries
  sentiment: {
    positive: ['上昇', '回復', '好調', '期待', '好転', '改善', '強気', '買い'],
    negative: ['下落', '懸念', 'リスク', '警戒', '悪化', '不安', '弱気', '売り'],
    neutral: ['維持', '横ばい', '推移', '様子見', '保持', '継続']
  },

  // File paths
  paths: {
    output: '../public/data/financial',
    articles: 'daily-articles.json',
    keywords: 'keywords-trend.json',
    sentiment: 'sentiment-analysis.json'
  },

  // Data retention settings
  retention: {
    days: 90,
    maxArticles: 1000
  },

  // Request settings
  request: {
    timeout: 10000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive'
    }
  }
};