import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";
import { useMemo } from "react";
import { PerformanceCard } from "./PerformanceCard";
import type { PerformanceMetrics } from "@/types/market";

const staleThresholdMs = 1000 * 60 * 60 * 24; // 24 hours

const fetchPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
  const response = await fetch("/data/metrics.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load performance metrics");
  }

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
    error,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["performance-metrics"],
    queryFn: fetchPerformanceMetrics,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const isStale = useMemo(() => {
    if (!metrics?.last_updated) return false;
    const parsed = new Date(metrics.last_updated);
    if (Number.isNaN(parsed.getTime())) return false;
    return Date.now() - parsed.getTime() > staleThresholdMs;
  }, [metrics?.last_updated]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40">
            <Skeleton className="h-full w-full" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <Alert variant="destructive" className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5" />
          <div>
            <AlertTitle>Unable to load performance metrics</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Please try again shortly."}
            </AlertDescription>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LastUpdatedBadge lastUpdated={metrics.last_updated} isRefreshing={isFetching} />
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh now
        </Button>
      </div>

      {isStale && (
        <Alert variant="destructive" className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5" />
          <div>
            <AlertTitle>Metrics may be outdated</AlertTitle>
            <AlertDescription>
              Data has not refreshed in the last 24 hours. Ensure the metrics pipeline is running
              or trigger it manually via{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                npm run financial:pipeline
              </code>
              .
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          description="Share of trades finishing in profit"
          trend={metrics.win_rate > 0.5 ? "up" : "down"}
        />
        <PerformanceCard
          title="Profit Factor"
          value={metrics.profit_factor}
          description="Gross profit divided by gross loss"
          trend={metrics.profit_factor > 1 ? "up" : "down"}
        />
      </div>
    </div>
  );
};
