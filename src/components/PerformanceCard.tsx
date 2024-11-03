import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface PerformanceCardProps {
  title: string;
  value: number;
  format?: (value: number) => string;
  trend?: "up" | "down";
  description?: string;
}

export const PerformanceCard = ({
  title,
  value,
  format = (v) => v.toFixed(2),
  trend,
  description,
}: PerformanceCardProps) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "";

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-neutral">{title}</h3>
        <div className="flex items-baseline space-x-2">
          <p className={`text-2xl font-semibold animate-number-change ${trendColor}`}>
            {format(displayValue)}
          </p>
        </div>
        {description && (
          <p className="text-xs text-neutral">{description}</p>
        )}
      </div>
    </Card>
  );
};