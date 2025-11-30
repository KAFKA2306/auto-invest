#!/usr/bin/env tsx
import "dotenv/config";
import YahooFinance from "yahoo-finance2";
import path from "node:path";
import { writeJson, writeCsv } from "./shared/io";
import { computeLeverage } from "./leverage/engine";
import { mean, std } from "./shared/math";

const yahooFinance = new YahooFinance();

const SYMBOL = "QQQ";
const BENCHMARK = "SPY";
const WINDOW_TRADING_DAYS = 756;
const SUMMARY_WINDOW_DAYS = 126;
const BORROW_SPREAD_ANNUAL = 0.01;
const FUND_FEE_ANNUAL = 0.0;
const CAP = 2.0;
const FRACTION = 0.5;
const TRADING_DAYS_PER_YEAR = 252;

const fetchHistory = async (symbol: string) => {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 10); // Fetch enough history

  const queryOptions = { period1: start, period2: end, interval: "1d" as const };
  const result = await yahooFinance.historical(symbol, queryOptions);
  return result.map((r) => ({
    date: r.date.toISOString().split("T")[0],
    close: r.adjClose || r.close,
  }));
};

// Mock risk free rate for now (or fetch from FRED if we had a provider)
// Using a fixed recent rate or simple linear interpolation if we had data
// For this port, I'll use a constant 4.5% annual rate to simplify, 
// as fetching from FRED requires an API key or a different scraper.
// The Python script used pandas_datareader for FRED.
// I will use a hardcoded recent value for simplicity in this "minimal" port,
// or I could try to fetch it. Let's stick to a constant for now to ensure it runs.
const RISK_FREE_RATE_ANNUAL_CONST = 0.045; 

const main = async () => {
  console.log(`Fetching data for ${SYMBOL} and ${BENCHMARK}...`);
  const [pricesRaw, spxPricesRaw] = await Promise.all([
    fetchHistory(SYMBOL),
    fetchHistory(BENCHMARK),
  ]);

  // Align data
  // Create a map of date -> close
  const priceMap = new Map(pricesRaw.map(p => [p.date, p.close]));
  const spxMap = new Map(spxPricesRaw.map(p => [p.date, p.close]));

  // Find intersection of dates
  const commonDates = pricesRaw
    .map(p => p.date)
    .filter(d => spxMap.has(d))
    .sort();

  const prices = commonDates.map(d => priceMap.get(d)!);
  const spxPrices = commonDates.map(d => spxMap.get(d)!);
  const ffrateDaily = new Array(prices.length).fill(RISK_FREE_RATE_ANNUAL_CONST / TRADING_DAYS_PER_YEAR);

  console.log(`Computing leverage metrics over ${prices.length} days...`);

  const leverage = computeLeverage(
    prices,
    commonDates,
    ffrateDaily,
    spxPrices,
    {
      windowTradingDays: WINDOW_TRADING_DAYS,
      riskFreeRateAnnual: RISK_FREE_RATE_ANNUAL_CONST,
      borrowSpreadAnnual: BORROW_SPREAD_ANNUAL,
      fundFeeAnnual: FUND_FEE_ANNUAL,
      cap: CAP,
      fraction: FRACTION,
    }
  );

  // Summarize recent performance
  const recentPrices = prices.slice(-SUMMARY_WINDOW_DAYS);
  const recentReturns = [];
  for(let i=1; i<recentPrices.length; i++) {
      recentReturns.push((recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1]);
  }
  
  const wins = recentReturns.filter(r => r > 0);
  const losses = recentReturns.filter(r => r < 0);
  const winRate = wins.length / recentReturns.length;
  const gains = wins.reduce((a, b) => a + b, 0);
  const lossSum = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = lossSum > 0 ? gains / lossSum : 0;
  
  // Sharpe
  const recentExcess = recentReturns.map(r => r - (RISK_FREE_RATE_ANNUAL_CONST/TRADING_DAYS_PER_YEAR));
  const recentMu = mean(recentExcess) * TRADING_DAYS_PER_YEAR;
  const recentSigma = std(recentExcess) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const sharpeRatio = recentSigma > 0 ? recentMu / recentSigma : 0;

  // Max Drawdown
  let peak = -Infinity;
  let maxDd = 0;
  let runningVal = 1;
  for(const r of recentReturns) {
      runningVal *= (1 + r);
      if(runningVal > peak) peak = runningVal;
      const dd = (runningVal - peak) / peak;
      if(dd < maxDd) maxDd = dd;
  }

  const payload = {
    generated_at: new Date().toISOString().replace("T", " ").replace(/\..+/, "Z"), // Match python format roughly
    last_updated: new Date().toISOString(),
    sharpe_ratio: sharpeRatio,
    max_drawdown: maxDd,
    win_rate: winRate,
    profit_factor: profitFactor,
    leverage: leverage,
  };

  const dataDir = path.join(process.cwd(), "public/data");
  await writeJson(path.join(dataDir, "metrics.json"), payload);
  
  // Save CSVs for debugging/verification
  const priceCsv = commonDates.map((d, i) => ({ date: d, close: prices[i] }));
  await writeCsv(path.join(dataDir, `price_${SYMBOL}.csv`), priceCsv);
  
  console.log(`Updated metrics.json (as_of=${leverage.as_of})`);
};

main().catch(console.error);
