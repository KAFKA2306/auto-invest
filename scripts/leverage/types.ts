export interface LeverageSeriesItem {
  date: string;
  price_close: number;
  ffrate_daily: number;
  realized_vol_annual: number;
  ewma_vol_annual: number;
  volatility_score: number;
  mu_excess_annual: number;
  kelly_leverage: number;
  fractional_kelly: number;
  L_kelly: number;
  L_vol: number;
  L_blend: number;
  max_drawdown: number;
  beta_spx: number;
  corr_spx: number;
}

export interface LeverageSummary {
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor: number;
}

export interface LeveragePayload {
  as_of: string;
  symbol: string;
  window_trading_days: number;
  trading_days_per_year: number;
  risk_free_rate_annual: number;
  borrow_spread_annual: number;
  fund_fee_annual: number;
  mu_excess_annual: number;
  volatility_annual: number;
  sharpe_ratio_annual: number;
  kelly_leverage: number;
  fractional_kelly: number;
  cap: number;
  suggested: {
    alpha: number;
    vol_target_annual: number;
    cap: number;
    L_kelly: number;
    L_vol: number;
    L_blend: number;
  };
  risk: {
    downside_deviation_annual: number;
    sortino_ratio_annual: number;
    max_drawdown: number;
    calmar_ratio: number;
    es_95: number;
    vol_of_vol: number;
    beta_spx: number;
    corr_spx: number;
  };
  series: LeverageSeriesItem[];
  generated_at?: string;
  last_updated?: string;
  sharpe_ratio?: number; // Flattened summary fields
  win_rate?: number;
  profit_factor?: number;
  leverage?: any; // For nested structure compatibility if needed
}
