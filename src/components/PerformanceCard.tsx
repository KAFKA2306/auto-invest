import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  const tone = trend === "up" ? "up" : trend === "down" ? "down" : null;
  const toneColor = tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-foreground";
  const toneBadgeClass = tone === "up"
    ? "bg-success.light text-success"
    : tone === "down"
      ? "bg-danger.light text-danger"
      : "bg-neutral.light text-neutral";

  return (
    <Card className="relative overflow-hidden border border-border/60 bg-card/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
          <Badge variant="outline" className={cn("rounded-full px-2 py-0 text-[10px] font-semibold", toneBadgeClass)}>
            {tone === "up" ? "Favorable" : tone === "down" ? "Watch" : "Neutral"}
          </Badge>
        </div>
        <p className={cn("text-3xl font-semibold leading-none tracking-tight animate-number-change", toneColor)}>
          {format(displayValue)}
        </p>
        {description && (
          <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </Card>
  );
};
