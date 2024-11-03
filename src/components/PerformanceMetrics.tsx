import { useEffect, useState } from "react";
import { PerformanceCard } from "./PerformanceCard";
import { PerformanceMetrics, calculateMetrics } from "@/lib/calculateMetrics";

const mockReturns = Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.02);

export const PerformanceMetricsGrid = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => 
    calculateMetrics(mockReturns)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const newReturns = [...mockReturns.slice(1), (Math.random() - 0.5) * 0.02];
      setMetrics(calculateMetrics(newReturns));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <PerformanceCard
        title="Sharpe Ratio"
        value={metrics.sharpeRatio}
        description="Risk-adjusted return measure"
        trend={metrics.sharpeRatio > 1 ? "up" : "down"}
      />
      <PerformanceCard
        title="Maximum Drawdown"
        value={metrics.maxDrawdown}
        format={(v) => `${(v * 100).toFixed(2)}%`}
        description="Largest peak-to-trough decline"
        trend={metrics.maxDrawdown > -0.1 ? "up" : "down"}
      />
      <PerformanceCard
        title="Win Rate"
        value={metrics.winRate}
        format={(v) => `${(v * 100).toFixed(1)}%`}
        description="Percentage of winning trades"
        trend={metrics.winRate > 0.5 ? "up" : "down"}
      />
      <PerformanceCard
        title="Profit Factor"
        value={metrics.profitFactor}
        description="Ratio of gross profit to gross loss"
        trend={metrics.profitFactor > 1 ? "up" : "down"}
      />
    </div>
  );
};