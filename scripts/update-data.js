import fs from 'fs';
import { execSync } from 'child_process';

async function fetchMarketData() {
  const csv = execSync("curl -L https://raw.githubusercontent.com/plotly/datasets/master/finance-charts-apple.csv", { encoding: 'utf-8' });
  const lines = csv.trim().split('\n').slice(1, 101);
  return lines.map(line => {
    const [date,, , , close, volume] = line.split(',');
    return {
      timestamp: new Date(date).toISOString(),
      price: parseFloat(close),
      volume: parseFloat(volume),
      symbol: 'AAPL'
    };
  });
}

function calculateMetrics(data) {
  const prices = data.map(d => d.price);
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  const sharpe = std === 0 ? 0 : (mean / std) * Math.sqrt(252);
  let cumulative = 1;
  const cumReturns = returns.map(r => {
    cumulative *= 1 + r;
    return cumulative;
  });
  let peak = cumReturns[0];
  let maxDrawdown = 0;
  for (const value of cumReturns) {
    if (value > peak) peak = value;
    const drawdown = value / peak - 1;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);
  const winRate = wins.length / returns.length;
  const gains = wins.reduce((a, b) => a + b, 0);
  const lossSum = -losses.reduce((a, b) => a + b, 0);
  const profitFactor = lossSum === 0 ? 0 : gains / lossSum;
  return {
    sharpe_ratio: sharpe,
    max_drawdown: maxDrawdown,
    win_rate: winRate,
    profit_factor: profitFactor
  };
}

async function main() {
  const market = await fetchMarketData();
  const metrics = calculateMetrics(market);
  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/market.json', JSON.stringify(market, null, 2));
  fs.writeFileSync('public/data/metrics.json', JSON.stringify(metrics, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
