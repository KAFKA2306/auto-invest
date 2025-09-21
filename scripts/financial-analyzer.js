import { ScraperUtils } from './scraper-utils.js';
import { CONFIG } from './scraper-config.js';

class FinancialAnalyzer {
  /**
   * Analyze keyword trends over time
   */
  static analyzeKeywordTrends(articles) {
    const dailyKeywords = {};
    const keywordTrends = {};

    // Group keywords by date
    for (const article of articles) {
      const date = article.date;
      if (!dailyKeywords[date]) {
        dailyKeywords[date] = {};
      }

      for (const keyword of article.keywords) {
        dailyKeywords[date][keyword] = (dailyKeywords[date][keyword] || 0) + 1;
        keywordTrends[keyword] = keywordTrends[keyword] || [];
      }
    }

    // Calculate trends for each keyword
    const dates = Object.keys(dailyKeywords).sort();
    for (const keyword of Object.keys(keywordTrends)) {
      const trend = [];

      for (const date of dates) {
        const count = dailyKeywords[date][keyword] || 0;
        trend.push({ date, count });
      }

      keywordTrends[keyword] = {
        total_mentions: trend.reduce((sum, day) => sum + day.count, 0),
        daily_data: trend,
        avg_daily: trend.length > 0 ? trend.reduce((sum, day) => sum + day.count, 0) / trend.length : 0
      };
    }

    return keywordTrends;
  }

  /**
   * Analyze sentiment trends over time
   */
  static analyzeSentimentTrends(articles) {
    const dailySentiment = {};
    const prioritySentiment = { high: [], medium: [], low: [] };

    for (const article of articles) {
      const date = article.date;
      const sentiment = article.sentiment || 0;
      const priority = article.priority || 'low';

      // Daily sentiment
      if (!dailySentiment[date]) {
        dailySentiment[date] = { sum: 0, count: 0, articles: [] };
      }
      dailySentiment[date].sum += sentiment;
      dailySentiment[date].count += 1;
      dailySentiment[date].articles.push({
        title: article.title,
        sentiment: sentiment,
        priority: priority
      });

      // Priority-based sentiment
      prioritySentiment[priority].push(sentiment);
    }

    // Calculate daily averages
    const dailyAverages = {};
    for (const [date, data] of Object.entries(dailySentiment)) {
      dailyAverages[date] = {
        average: data.count > 0 ? data.sum / data.count : 0,
        article_count: data.count,
        articles: data.articles
      };
    }

    // Calculate priority averages
    const priorityAverages = {};
    for (const [priority, sentiments] of Object.entries(prioritySentiment)) {
      priorityAverages[priority] = {
        average: sentiments.length > 0 ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0,
        count: sentiments.length,
        distribution: this.calculateSentimentDistribution(sentiments)
      };
    }

    return {
      daily_sentiment: dailyAverages,
      priority_sentiment: priorityAverages,
      overall_trend: this.calculateOverallTrend(dailyAverages)
    };
  }

  /**
   * Calculate sentiment distribution
   */
  static calculateSentimentDistribution(sentiments) {
    let positive = 0, negative = 0, neutral = 0;

    for (const sentiment of sentiments) {
      if (sentiment > 0.1) positive++;
      else if (sentiment < -0.1) negative++;
      else neutral++;
    }

    const total = sentiments.length;
    return {
      positive: total > 0 ? positive / total : 0,
      negative: total > 0 ? negative / total : 0,
      neutral: total > 0 ? neutral / total : 0
    };
  }

  /**
   * Calculate overall sentiment trend
   */
  static calculateOverallTrend(dailyAverages) {
    const dates = Object.keys(dailyAverages).sort();
    if (dates.length < 2) return 'insufficient_data';

    const recent = dailyAverages[dates[dates.length - 1]].average;
    const previous = dailyAverages[dates[dates.length - 2]].average;

    if (recent > previous + 0.1) return 'improving';
    if (recent < previous - 0.1) return 'declining';
    return 'stable';
  }

  /**
   * Identify hot topics and emerging trends
   */
  static identifyHotTopics(articles, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentArticles = articles.filter(article =>
      new Date(article.date) >= cutoffDate
    );

    const keywordActivity = {};
    const topicClusters = {};

    // Analyze keyword activity
    for (const article of recentArticles) {
      for (const keyword of article.keywords) {
        if (!keywordActivity[keyword]) {
          keywordActivity[keyword] = {
            mentions: 0,
            articles: [],
            sentiment_sum: 0,
            priority_score: 0
          };
        }

        keywordActivity[keyword].mentions++;
        keywordActivity[keyword].articles.push({
          title: article.title,
          date: article.date,
          sentiment: article.sentiment,
          priority: article.priority
        });
        keywordActivity[keyword].sentiment_sum += article.sentiment;

        // Priority scoring
        const priorityScore = article.priority === 'high' ? 3 :
                            article.priority === 'medium' ? 2 : 1;
        keywordActivity[keyword].priority_score += priorityScore;
      }
    }

    // Calculate hotness scores
    const hotTopics = [];
    for (const [keyword, data] of Object.entries(keywordActivity)) {
      const avgSentiment = data.mentions > 0 ? data.sentiment_sum / data.mentions : 0;
      const hotnessScore = data.mentions * 2 + data.priority_score + Math.abs(avgSentiment) * 5;

      hotTopics.push({
        keyword,
        mentions: data.mentions,
        hotness_score: hotnessScore,
        avg_sentiment: avgSentiment,
        priority_score: data.priority_score,
        recent_articles: data.articles.slice(-3) // Latest 3 articles
      });
    }

    // Sort by hotness score
    hotTopics.sort((a, b) => b.hotness_score - a.hotness_score);

    return {
      hot_topics: hotTopics.slice(0, 10),
      analysis_period: `${days} days`,
      total_articles_analyzed: recentArticles.length
    };
  }

  /**
   * Generate market sentiment indicators
   */
  static generateMarketIndicators(articles) {
    const indicators = {
      overall_sentiment: 0,
      volatility_index: 0,
      news_volume: articles.length,
      key_themes: [],
      risk_signals: [],
      opportunity_signals: []
    };

    // Calculate overall sentiment
    const sentiments = articles.map(a => a.sentiment || 0);
    indicators.overall_sentiment = sentiments.length > 0 ?
      sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0;

    // Calculate volatility (sentiment variance)
    if (sentiments.length > 1) {
      const mean = indicators.overall_sentiment;
      const variance = sentiments.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / sentiments.length;
      indicators.volatility_index = Math.sqrt(variance);
    }

    // Identify key themes
    const keywordCounts = {};
    for (const article of articles) {
      for (const keyword of article.keywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }

    indicators.key_themes = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, mentions: count }));

    // Risk signals (negative keywords with high frequency)
    const riskKeywords = ['下落', '懸念', 'リスク', '警戒', '暴落', '不安'];
    for (const keyword of riskKeywords) {
      if (keywordCounts[keyword] >= 2) {
        indicators.risk_signals.push({
          signal: keyword,
          frequency: keywordCounts[keyword],
          severity: keywordCounts[keyword] >= 5 ? 'high' : 'medium'
        });
      }
    }

    // Opportunity signals (positive keywords with high frequency)
    const opportunityKeywords = ['上昇', '回復', '好調', '期待', '改善', '強気'];
    for (const keyword of opportunityKeywords) {
      if (keywordCounts[keyword] >= 2) {
        indicators.opportunity_signals.push({
          signal: keyword,
          frequency: keywordCounts[keyword],
          strength: keywordCounts[keyword] >= 5 ? 'high' : 'medium'
        });
      }
    }

    return indicators;
  }

  /**
   * Main analysis function
   */
  static async analyzeFinancialData() {
    try {
      console.log('[analyzer] Starting financial data analysis...');

      // Load articles data
      const articlesData = await ScraperUtils.loadJsonData(CONFIG.paths.articles);
      if (!articlesData || !articlesData.articles) {
        throw new Error('No articles data found');
      }

      const articles = articlesData.articles;
      console.log(`[analyzer] Analyzing ${articles.length} articles`);

      // Perform analysis
      const keywordTrends = this.analyzeKeywordTrends(articles);
      const sentimentTrends = this.analyzeSentimentTrends(articles);
      const hotTopics = this.identifyHotTopics(articles);
      const marketIndicators = this.generateMarketIndicators(articles);

      // Create comprehensive analysis report
      const analysisReport = {
        timestamp: new Date().toISOString(),
        articles_analyzed: articles.length,
        analysis_period: {
          start: articles.length > 0 ? articles[articles.length - 1].date : null,
          end: articles.length > 0 ? articles[0].date : null
        },
        keyword_trends: keywordTrends,
        sentiment_analysis: sentimentTrends,
        hot_topics: hotTopics,
        market_indicators: marketIndicators,
        summary: {
          most_mentioned_keywords: Object.entries(keywordTrends)
            .sort(([,a], [,b]) => b.total_mentions - a.total_mentions)
            .slice(0, 5)
            .map(([keyword, data]) => ({ keyword, mentions: data.total_mentions })),
          sentiment_summary: {
            overall: marketIndicators.overall_sentiment,
            trend: sentimentTrends.overall_trend,
            volatility: marketIndicators.volatility_index
          }
        }
      };

      // Save analysis results
      await ScraperUtils.saveJsonData('analysis-report.json', analysisReport);
      await ScraperUtils.saveJsonData(CONFIG.paths.keywords, keywordTrends);
      await ScraperUtils.saveJsonData(CONFIG.paths.sentiment, sentimentTrends);

      console.log('[analyzer] Analysis completed successfully');
      console.log(`[analyzer] Overall sentiment: ${marketIndicators.overall_sentiment.toFixed(3)}`);
      console.log(`[analyzer] Hot topics: ${hotTopics.hot_topics.slice(0, 3).map(t => t.keyword).join(', ')}`);

      return analysisReport;

    } catch (error) {
      console.error('[analyzer] Analysis failed:', error.message);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  try {
    const report = await FinancialAnalyzer.analyzeFinancialData();
    console.log('[main] Financial analysis completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[main] Financial analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FinancialAnalyzer };