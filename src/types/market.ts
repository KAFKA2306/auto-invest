export interface MarketData {
  timestamp: string;
  price: number;
  volume: number;
  symbol: string;
}

export interface PerformanceMetrics {
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
  last_updated?: string;
}
