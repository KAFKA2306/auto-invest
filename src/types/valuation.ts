export interface ValuationPoint {
  date: string;
  forward_pe: number;
  forward_eps: number;
  earnings_yield?: number;
  earnings_yield_spread?: number;
  implied_forward_pe_from_price?: number;
  price_close?: number;
  price_index?: number;
}

export interface ValuationPayload {
  as_of: string;
  latest?: {
    forward_pe?: number;
    forward_eps?: number;
    earnings_yield?: number;
    earnings_yield_spread?: number;
    yoy_eps_growth?: number;
    implied_forward_pe_from_price?: number;
  };
  series: ValuationPoint[];
  source?: string;
}
