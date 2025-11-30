export type ComponentInput = {
  symbol: string;
  name: string;
  weight: number;
};

export type ExistingDataset = {
  prior_period?: { date: string; label: string; eps: number };
  base_period?: { date: string; label: string; eps: number };
  components?: EpsRow[];
};

export type EpsRow = {
  symbol: string;
  name: string;
  quarter: string;
  eps: number;
  eps_yoy: number | null;
  weight: number;
  source: string;
  marketCap?: number;
};
