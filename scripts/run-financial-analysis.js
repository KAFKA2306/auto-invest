import { FinancialScraper } from './financial-scraper.js';
import { FinancialScraperHeadless } from './financial-scraper-headless.js';
import { FinancialAnalyzer } from './financial-analyzer.js';

/**
 * Combined scraping and analysis pipeline
 */
async function runFinancialAnalysis() {
  console.log('[pipeline] Starting financial analysis pipeline...');

  try {
    // Debug environment
    console.log('[pipeline] Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- CI:', process.env.CI);
    console.log('- Working directory:', process.cwd());

    // Step 1: Scrape new financial data
    console.log('[pipeline] Step 1: Scraping financial data...');

    // Use headless scraper in CI environment, Playwright locally
    const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'production';
    console.log(`[pipeline] isCI determined as: ${isCI}`);

    // Test module loading first
    console.log('[pipeline] Testing module loading...');

    let scraper;
    if (isCI) {
      console.log('[pipeline] Loading FinancialScraperHeadless...');
      const { FinancialScraperHeadless } = await import('./financial-scraper-headless.js');
      scraper = new FinancialScraperHeadless();
      console.log('[pipeline] ✅ FinancialScraperHeadless loaded');
    } else {
      console.log('[pipeline] Loading FinancialScraper...');
      const { FinancialScraper } = await import('./financial-scraper.js');
      scraper = new FinancialScraper();
      console.log('[pipeline] ✅ FinancialScraper loaded');
    }

    console.log(`[pipeline] Using ${isCI ? 'headless' : 'playwright'} scraper`);
    const scrapedData = await scraper.scrape();
    console.log(`[pipeline] Scraped ${scrapedData.articles.length} articles`);

    // Step 2: Analyze the data
    console.log('[pipeline] Step 2: Analyzing financial data...');
    const analysisReport = await FinancialAnalyzer.analyzeFinancialData();
    console.log(`[pipeline] Generated analysis report with ${analysisReport.articles_analyzed} articles`);

    // Step 3: Report completion
    console.log('[pipeline] Financial analysis pipeline completed successfully');
    console.log(`[pipeline] Summary:`);
    console.log(`  - Total articles: ${scrapedData.articles.length}`);
    console.log(`  - Overall sentiment: ${analysisReport.market_indicators.overall_sentiment.toFixed(3)}`);
    console.log(`  - Hot topics: ${analysisReport.hot_topics.hot_topics.slice(0, 3).map(t => t.keyword).join(', ')}`);
    console.log(`  - Risk signals: ${analysisReport.market_indicators.risk_signals.length}`);
    console.log(`  - Opportunity signals: ${analysisReport.market_indicators.opportunity_signals.length}`);

    return {
      success: true,
      scrapedData,
      analysisReport,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[pipeline] Financial analysis pipeline failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await runFinancialAnalysis();
    process.exit(0);
  } catch (error) {
    console.error('[main] Pipeline execution failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runFinancialAnalysis };// Debug CI trigger Sun Sep 21 13:23:30 JST 2025
