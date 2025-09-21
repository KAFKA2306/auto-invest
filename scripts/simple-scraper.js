// Ultra-simple scraper for CI environment
import { writeFile, mkdir, readFile } from 'fs/promises';
import { JSDOM } from 'jsdom';

const CONFIG = {
  url: 'https://www.shenmacro.com',
  outputDir: '../public/data/financial',
  retryCount: 3,
  delay: 1000
};

const keywords = {
  high: ['S&P500', 'FRB', 'FOMC', '利下げ', '利上げ'],
  medium: ['GDP', '中国経済', 'ドル円', '日銀', 'ECB'],
  low: ['株価', '市場', '経済指標']
};

const sentimentWords = {
  positive: ['上昇', '回復', '好調', '期待'],
  negative: ['下落', '懸念', 'リスク', '警戒']
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateId(title, url) {
  return Buffer.from(title + url).toString('base64').substring(0, 12);
}

function extractKeywords(text) {
  const found = [];
  const lowerText = text.toLowerCase();

  for (const [priority, words] of Object.entries(keywords)) {
    for (const keyword of words) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }
  }
  return found;
}

function analyzeSentiment(text) {
  const lowerText = text.toLowerCase();
  let score = 0;

  for (const word of sentimentWords.positive) {
    if (lowerText.includes(word.toLowerCase())) score += 0.1;
  }

  for (const word of sentimentWords.negative) {
    if (lowerText.includes(word.toLowerCase())) score -= 0.1;
  }

  return Math.max(-1, Math.min(1, score));
}

async function fetchWithRetry(url, retries = CONFIG.retryCount) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[simple-scraper] Fetching: ${url} (attempt ${i + 1})`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await sleep(CONFIG.delay);
      return await response.text();

    } catch (error) {
      console.warn(`[simple-scraper] Attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) throw error;
      await sleep(CONFIG.delay * (i + 1));
    }
  }
}

async function scrapeArticles() {
  try {
    const html = await fetchWithRetry(CONFIG.url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const articles = [];
    const links = document.querySelectorAll('a[href*="archives"]');

    console.log(`[simple-scraper] Found ${links.length} potential article links`);

    for (const link of links) {
      const href = link.getAttribute('href');
      const title = link.textContent?.trim();

      if (!title || !href || title.length < 10) continue;
      if (!href.includes('archives/')) continue;

      let fullUrl = href;
      if (href.startsWith('/')) {
        fullUrl = CONFIG.url + href;
      } else if (!href.startsWith('http')) {
        continue;
      }

      const keywords = extractKeywords(title);
      const sentiment = analyzeSentiment(title);

      const article = {
        id: generateId(title, fullUrl),
        title: title,
        date: new Date().toISOString().split('T')[0],
        source: '神宮前マクロ',
        url: fullUrl,
        keywords: keywords,
        sentiment: sentiment,
        priority: keywords.length >= 2 ? 'high' : keywords.length >= 1 ? 'medium' : 'low',
        timestamp: new Date().toISOString()
      };

      articles.push(article);
    }

    console.log(`[simple-scraper] Parsed ${articles.length} articles`);
    return articles;

  } catch (error) {
    console.error(`[simple-scraper] Scraping failed: ${error.message}`);
    return [];
  }
}

async function saveData(articles) {
  try {
    await mkdir(CONFIG.outputDir, { recursive: true });

    const keywordCounts = {};
    let sentimentSum = 0;

    for (const article of articles) {
      for (const keyword of article.keywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
      sentimentSum += article.sentiment;
    }

    const topKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    const data = {
      timestamp: new Date().toISOString(),
      articles: articles,
      summary: {
        total_articles: articles.length,
        sentiment_average: articles.length > 0 ? sentimentSum / articles.length : 0,
        top_keywords: topKeywords,
        keyword_counts: keywordCounts,
        high_priority_count: articles.filter(a => a.priority === 'high').length,
        medium_priority_count: articles.filter(a => a.priority === 'medium').length,
        low_priority_count: articles.filter(a => a.priority === 'low').length
      }
    };

    await writeFile(`${CONFIG.outputDir}/daily-articles.json`, JSON.stringify(data, null, 2));

    // Simple analysis report
    const analysisReport = {
      timestamp: new Date().toISOString(),
      articles_analyzed: articles.length,
      market_indicators: {
        overall_sentiment: data.summary.sentiment_average,
        volatility_index: 0,
        news_volume: articles.length,
        key_themes: Object.entries(keywordCounts).slice(0, 5).map(([keyword, count]) => ({ keyword, mentions: count })),
        risk_signals: [],
        opportunity_signals: []
      },
      hot_topics: {
        hot_topics: Object.entries(keywordCounts).slice(0, 10).map(([keyword, mentions]) => ({
          keyword,
          mentions,
          hotness_score: mentions * 2,
          avg_sentiment: 0
        }))
      }
    };

    await writeFile(`${CONFIG.outputDir}/analysis-report.json`, JSON.stringify(analysisReport, null, 2));

    console.log(`[simple-scraper] Saved data to ${CONFIG.outputDir}`);
    console.log(`[simple-scraper] Articles: ${articles.length}, Sentiment: ${data.summary.sentiment_average.toFixed(3)}`);

    return data;

  } catch (error) {
    console.error(`[simple-scraper] Save failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('[simple-scraper] Starting simple financial scraper...');

  try {
    const articles = await scrapeArticles();
    const result = await saveData(articles);

    console.log('[simple-scraper] Simple scraper completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('[simple-scraper] Simple scraper failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}