export interface PerformanceMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
}

export const calculateMetrics = (returns: number[]): PerformanceMetrics => {
  // 簡易的な計算ロジック
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const std = Math.sqrt(
    returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
  );
  
  const wins = returns.filter(r => r > 0).length;
  const losses = returns.filter(r => r < 0).length;
  
  const grossProfit = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));

  return {
    sharpeRatio: (mean / std) * Math.sqrt(252), // 年率換算
    maxDrawdown: Math.min(...returns.map((_, i) => {
      const slice = returns.slice(0, i + 1);
      return slice[slice.length - 1] - Math.max(...slice);
    })),
    winRate: wins / (wins + losses),
    profitFactor: grossProfit / grossLoss,
  };
};