export interface EpsComponent {
  symbol: string;
  name: string;
  quarter: string;
  eps: number;
  eps_yoy?: number | null;
  weight?: number | null;
  source?: string;
  history?: { date: string; eps: number }[];
}

export interface BottomUpDataset {
  as_of: string;
  prior_period: {
    date: string;
    label: string;
    eps: number;
  };
  base_period: {
    date: string;
    label: string;
    eps: number;
  };
  components: EpsComponent[];
}

export interface EditableComponent extends EpsComponent {
  input_weight: number;
  input_eps_yoy: number | null;
  contribution?: number; // input_weight * input_eps_yoy
}

export interface BottomUpAggregate {
  totalWeight: number;
  activeWeight: number;
  coverage: number; // activeWeight / totalWeight
  weightedAverageGrowth: number; // sum(weight * yoy) / activeWeight
  projectedEps: number | null;
}
