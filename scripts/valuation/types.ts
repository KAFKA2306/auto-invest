export interface ValuationRow {
  date: string;
  price_index: number;
  rf_annual: number;
  gdp_growth_yoy: number;
  mu: number;
  sigma: number;
  mu_excess: number;
  earnings_yield: number;
  earnings_yield_spread: number;
  forward_eps: number;
  forward_pe: number;
  implied_forward_pe_from_price: number;
  yoy_eps_growth: number;
}

export interface ValuationPayload {
  as_of: string;
  source: string;
  latest: {
    forward_pe: number;
    forward_eps: number;
    earnings_yield: number;
    earnings_yield_spread: number;
    yoy_eps_growth: number;
    implied_forward_pe_from_price: number;
  };
  series: Partial<ValuationRow>[];
  metadata: {
    generated_at: string;
    rolling_window_days: number;
    pe_clip: [number, number];
    ref_pe: number;
  };
}
