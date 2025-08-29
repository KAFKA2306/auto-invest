import { useEffect, useState } from "react";
import { PerformanceCard } from "./PerformanceCard";
import { getMarketData, analyzeMarket } from "@/lib/api";
import type { PerformanceMetrics } from "@/types/market";

export const PerformanceMetricsGrid = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const fetchMetrics = async () => {
    const market = await getMarketData("TEST");
    const result = await analyzeMarket(market);
    setMetrics(result);
  };

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 5000);
    return () => clearInterval(id);
  }, []);

  if (!metrics) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <PerformanceCard
        title="Sharpe Ratio"
        value={metrics.sharpe_ratio}
        description="Risk-adjusted return measure"
        trend={metrics.sharpe_ratio > 1 ? "up" : "down"}
      />
      <PerformanceCard
        title="Maximum Drawdown"
        value={metrics.max_drawdown}
        format={(v) => `${(v * 100).toFixed(2)}%`}
        description="Largest peak-to-trough decline"
        trend={metrics.max_drawdown > -0.1 ? "up" : "down"}
      />
      <PerformanceCard
        title="Win Rate"
        value={metrics.win_rate}
        format={(v) => `${(v * 100).toFixed(1)}%`}
        description="Percentage of winning trades"
        trend={metrics.win_rate > 0.5 ? "up" : "down"}
      />
      <PerformanceCard
        title="Profit Factor"
        value={metrics.profit_factor}
        description="Ratio of gross profit to gross loss"
        trend={metrics.profit_factor > 1 ? "up" : "down"}
      />
    </div>
  );
};
