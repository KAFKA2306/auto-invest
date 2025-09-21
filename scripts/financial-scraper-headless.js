import { JSDOM } from 'jsdom';
import { CONFIG } from './scraper-config.js';
import { ScraperUtils } from './scraper-utils.js';

class FinancialScraperHeadless {
  constructor() {
    this.userAgent = CONFIG.request.userAgent;
  }

  /**
   * Fetch page content with simple HTTP
   */
  async fetchPage(url) {
    return ScraperUtils.retry(async () => {
      console.log(`[scraper-headless] Fetching: ${url}`);

      const response = await fetch(url, {
        headers: CONFIG.request.headers,
        timeout: CONFIG.request.timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await ScraperUtils.sleep(CONFIG.sites.shenmacro.rateLimit);
      return await response.text();
    }, CONFIG.sites.shenmacro.maxRetries);
  }

  /**
   * Parse articles from HTML content using JSDOM
   */
  parseArticles(html, siteConfig) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const articles = [];

    try {
      // Look for article links
      const articleElements = document.querySelectorAll('a[href*="archives"]');

      for (const element of articleElements) {
        const href = element.getAttribute('href');
        const title = element.textContent?.trim();

        if (!title || !href) continue;

        // Skip non-article links
        if (!href.includes('archives/') || title.length < 10) continue;

        // Create full URL
        let fullUrl = href;
        if (href.startsWith('/')) {
          fullUrl = siteConfig.url + href;
        } else if (!href.startsWith('http')) {
          continue;
        }

        // Extract date from URL or use current date
        const dateMatch = href.match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);
        let articleDate = new Date().toISOString().split('T')[0];

        if (dateMatch) {
          articleDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }

        // Generate article data
        const article = {
          id: ScraperUtils.generateArticleId(title, fullUrl),
          title: title,
          date: articleDate,
          source: siteConfig.name,
          url: fullUrl,
          keywords: ScraperUtils.extractKeywords(title).map(k => k.keyword),
          sentiment: ScraperUtils.analyzeSentiment(title),
          priority: this.calculatePriority(title),
          timestamp: new Date().toISOString()
        };

        try {
          ScraperUtils.validateArticle(article);
          articles.push(article);
        } catch (error) {
          console.warn(`[scraper-headless] Invalid article skipped: ${error.message}`);
        }
      }

      console.log(`[scraper-headless] Parsed ${articles.length} articles from ${siteConfig.name}`);
      return articles;

    } catch (error) {
      console.error(`[scraper-headless] Error parsing articles: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate article priority based on keywords
   */
  calculatePriority(title) {
    const keywords = ScraperUtils.extractKeywords(title);
    const totalScore = keywords.reduce((sum, k) => sum + k.score, 0);

    if (totalScore >= 6) return 'high';
    if (totalScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Scrape articles from Shenmacro site
   */
  async scrapeShenmacro() {
    const siteConfig = CONFIG.sites.shenmacro;

    try {
      // Check robots.txt compliance
      const robotsAllowed = await ScraperUtils.checkRobotsTxt(siteConfig.url);
      if (!robotsAllowed) {
        throw new Error('Robots.txt disallows scraping');
      }

      // Fetch main page
      const html = await this.fetchPage(siteConfig.url);
      const articles = this.parseArticles(html, siteConfig);

      return articles;

    } catch (error) {
      console.error(`[scraper-headless] Error scraping ${siteConfig.name}: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary(articles) {
    const keywordCounts = {};
    let sentimentSum = 0;

    for (const article of articles) {
      // Count keywords
      for (const keyword of article.keywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }

      // Sum sentiment
      sentimentSum += article.sentiment || 0;
    }

    // Get top keywords
    const topKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    return {
      total_articles: articles.length,
      sentiment_average: articles.length > 0 ? sentimentSum / articles.length : 0,
      top_keywords: topKeywords,
      keyword_counts: keywordCounts,
      high_priority_count: articles.filter(a => a.priority === 'high').length,
      medium_priority_count: articles.filter(a => a.priority === 'medium').length,
      low_priority_count: articles.filter(a => a.priority === 'low').length
    };
  }

  /**
   * Main scraping function
   */
  async scrape() {
    try {
      console.log('[scraper-headless] Starting financial data scraping (headless mode)...');

      // Load existing data
      const existingData = await ScraperUtils.loadJsonData(CONFIG.paths.articles);
      let allArticles = existingData?.articles || [];

      // Scrape new articles
      const newArticles = await this.scrapeShenmacro();

      // Merge new articles with existing (avoid duplicates)
      const existingIds = new Set(allArticles.map(a => a.id));
      const uniqueNewArticles = newArticles.filter(a => !existingIds.has(a.id));

      allArticles = [...allArticles, ...uniqueNewArticles];

      // Clean old data
      allArticles = ScraperUtils.cleanOldData(allArticles);

      // Limit total articles
      if (allArticles.length > CONFIG.retention.maxArticles) {
        allArticles = allArticles
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, CONFIG.retention.maxArticles);
      }

      // Generate summary
      const summary = this.generateSummary(allArticles);

      // Save results
      const outputData = {
        timestamp: new Date().toISOString(),
        articles: allArticles,
        summary: summary
      };

      await ScraperUtils.saveJsonData(CONFIG.paths.articles, outputData);

      console.log(`[scraper-headless] Scraping completed successfully!`);
      console.log(`[scraper-headless] Total articles: ${allArticles.length}`);
      console.log(`[scraper-headless] New articles: ${uniqueNewArticles.length}`);
      console.log(`[scraper-headless] Average sentiment: ${summary.sentiment_average.toFixed(2)}`);

      return outputData;

    } catch (error) {
      console.error('[scraper-headless] Scraping failed:', error.message);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const scraper = new FinancialScraperHeadless();

  try {
    const result = await scraper.scrape();
    console.log('[main] Financial scraping completed successfully (headless mode)');
    process.exit(0);
  } catch (error) {
    console.error('[main] Financial scraping failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FinancialScraperHeadless };