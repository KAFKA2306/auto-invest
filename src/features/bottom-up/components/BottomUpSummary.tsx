import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BottomUpAggregate, BottomUpDataset } from "../types";
import { fmtPct, fmtNumber } from "@/lib/utils";

interface BottomUpSummaryProps {
  aggregate: BottomUpAggregate;
  dataset?: BottomUpDataset;
  topDownForwardEps?: number;
}

export const BottomUpSummary = ({ aggregate, dataset, topDownForwardEps }: BottomUpSummaryProps) => {
  const priorLabel = dataset?.prior_period.label ?? "Prior EPS";
  const priorEps = dataset?.prior_period.eps;
  const baseLabel = dataset?.base_period.label ?? "Latest EPS";

  const deltaVsTopDown =
    aggregate.projectedEps !== null && topDownForwardEps !== undefined
      ? (aggregate.projectedEps - topDownForwardEps) / topDownForwardEps
      : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weighted EPS YoY</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{fmtPct(aggregate.weightedGrowth, 1)}</div>
          <p className="text-xs text-muted-foreground">Sum(weight × YoY). Coverage adjusts for missing YoY.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Bottom-up EPS (next)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {fmtNumber(aggregate.projectedEps, 1)}
          </div>
          <p className="text-xs text-muted-foreground">
            Based on {priorLabel}: {fmtNumber(priorEps, 1)} × (1 + YoY)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{fmtPct(aggregate.coverage, 1)}</div>
          <p className="text-xs text-muted-foreground">
            Active weights {fmtPct(aggregate.activeWeight, 1)} of total {fmtPct(aggregate.totalWeight, 1)}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top-down EPS ref</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{fmtNumber(topDownForwardEps, 1)}</div>
          <p className="text-xs text-muted-foreground">
            {baseLabel}. Δ vs bottom-up: {fmtPct(deltaVsTopDown, 1)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
