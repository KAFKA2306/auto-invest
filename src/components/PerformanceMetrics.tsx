import { useQuery } from "@tanstack/react-query";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";
import { PerformanceCard } from "./PerformanceCard";
import { Button } from "@/components/ui/button";
import type { PerformanceMetrics } from "@/types/market";

const fetchPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
  const base = import.meta.env.BASE_URL ?? "/";
  const response = await fetch(`${base}data/metrics.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch metrics: ${response.status}`);
  const payload = (await response.json()) as PerformanceMetrics;
  const lastModifiedHeader = response.headers.get("last-modified");

  return {
    ...payload,
    last_updated:
      payload.last_updated ??
      (lastModifiedHeader ? new Date(lastModifiedHeader).toISOString() : undefined),
  };
};

export const PerformanceMetricsGrid = () => {
  const {
    data: metrics,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["performance-metrics"],
    queryFn: fetchPerformanceMetrics,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (isError) {
    return (
      <section className="rounded-xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Performance snapshot</h2>
            <p className="text-sm text-muted-foreground">Unable to load performance metrics.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  if (!metrics) return null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Performance snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Core trading metrics aggregated from the latest completed pipeline run.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LastUpdatedBadge lastUpdated={metrics.last_updated} isRefreshing={isFetching} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <PerformanceCard
          title="Sharpe Ratio"
          value={metrics.sharpe_ratio}
          description="Risk-adjusted return across the most recent period"
          trend={metrics.sharpe_ratio > 1 ? "up" : "down"}
        />
        <PerformanceCard
          title="Maximum Drawdown"
          value={metrics.max_drawdown}
          format={(v) => `${(v * 100).toFixed(2)}%`}
          description="Largest peak-to-trough decline in the monitored window"
          trend={metrics.max_drawdown > -0.1 ? "up" : "down"}
        />
        <PerformanceCard
          title="Win Rate"
          value={metrics.win_rate}
          format={(v) => `${(v * 100).toFixed(1)}%`}
          description="Share of daily QQQ returns that are positive (last ~6M)"
          trend={metrics.win_rate > 0.5 ? "up" : "down"}
        />
        <PerformanceCard
          title="Profit Factor"
          value={metrics.profit_factor}
          description="Gross profit divided by gross loss"
          trend={metrics.profit_factor > 1 ? "up" : "down"}
        />
      </div>
    </section>
  );
};
