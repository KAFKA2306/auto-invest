import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { CONFIG } from './scraper-config.js';

export class ScraperUtils {
  /**
   * Generate unique ID for article based on title and URL
   */
  static generateArticleId(title, url) {
    const content = `${title}-${url}`;
    return createHash('md5').update(content, 'utf8').digest('hex').substring(0, 12);
  }

  /**
   * Sleep for specified milliseconds
   */
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check robots.txt compliance
   */
  static async checkRobotsTxt(siteUrl) {
    try {
      const robotsUrl = `${siteUrl}/robots.txt`;
      const response = await fetch(robotsUrl);
      if (!response.ok) {
        console.warn(`[robots.txt] Could not fetch ${robotsUrl}`);
        return true; // Allow if robots.txt not found
      }
      const robotsText = await response.text();

      // Simple check for disallow patterns
      const lines = robotsText.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('disallow: /')) {
          console.log(`[robots.txt] Found restrictions: ${line}`);
        }
      }
      return true; // For now, allow all (implement proper parsing if needed)
    } catch (error) {
      console.warn(`[robots.txt] Error checking robots.txt: ${error.message}`);
      return true; // Allow on error
    }
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`[retry] Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Extract keywords from text with priority scoring
   */
  static extractKeywords(text) {
    const found = [];
    const lowerText = text.toLowerCase();

    // Check high priority keywords
    for (const keyword of CONFIG.keywords.high) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push({ keyword, priority: 'high', score: 3 });
      }
    }

    // Check medium priority keywords
    for (const keyword of CONFIG.keywords.medium) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push({ keyword, priority: 'medium', score: 2 });
      }
    }

    // Check low priority keywords
    for (const keyword of CONFIG.keywords.low) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push({ keyword, priority: 'low', score: 1 });
      }
    }

    return found;
  }

  /**
   * Analyze sentiment of text
   */
  static analyzeSentiment(text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    // Count positive words
    for (const word of CONFIG.sentiment.positive) {
      const matches = (lowerText.match(new RegExp(word.toLowerCase(), 'g')) || []).length;
      positiveCount += matches;
      score += matches * 0.1;
    }

    // Count negative words
    for (const word of CONFIG.sentiment.negative) {
      const matches = (lowerText.match(new RegExp(word.toLowerCase(), 'g')) || []).length;
      negativeCount += matches;
      score -= matches * 0.1;
    }

    // Normalize score to -1 to 1 range
    const totalWords = positiveCount + negativeCount;
    if (totalWords === 0) return 0;

    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Ensure output directory exists
   */
  static async ensureOutputDir() {
    const outputPath = CONFIG.paths.output;
    try {
      await fs.mkdir(outputPath, { recursive: true });
    } catch (error) {
      console.error(`[utils] Failed to create output directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save data to JSON file
   */
  static async saveJsonData(filename, data) {
    await this.ensureOutputDir();
    const filePath = path.resolve(CONFIG.paths.output, filename);

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[utils] Saved data to ${filePath}`);
    } catch (error) {
      console.error(`[utils] Failed to save data to ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load existing data from JSON file
   */
  static async loadJsonData(filename) {
    const filePath = path.resolve(CONFIG.paths.output, filename);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`[utils] File ${filePath} not found, starting with empty data`);
        return null;
      }
      console.error(`[utils] Failed to load data from ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean old data based on retention policy
   */
  static cleanOldData(articles, retentionDays = CONFIG.retention.days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return articles.filter(article => {
      const articleDate = new Date(article.date);
      return articleDate >= cutoffDate;
    });
  }

  /**
   * Validate article data structure
   */
  static validateArticle(article) {
    const required = ['id', 'title', 'date', 'source', 'url'];

    for (const field of required) {
      if (!article[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate date format
    if (isNaN(new Date(article.date).getTime())) {
      throw new Error(`Invalid date format: ${article.date}`);
    }

    return true;
  }
}