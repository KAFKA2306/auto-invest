import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LeverageMetrics {
  as_of: string;
  symbol: string;
  sharpe_ratio_annual: number;
  kelly_leverage: number;
  fractional_kelly: number;
  volatility_annual: number;
  suggested: {
    alpha: number;
    vol_target_annual: number;
    cap: number;
    L_kelly: number;
    L_vol: number;
    L_blend: number;
  };
  risk: {
    downside_deviation_annual: number;
    sortino_ratio_annual: number;
    max_drawdown: number;
    calmar_ratio: number;
    es_95: number;
    vol_of_vol: number;
    beta_spx: number;
    corr_spx: number;
  };
  series: Array<{
    date: string;
    price_close: number;
    volatility_score: number;
    realized_vol_annual: number;
    ewma_vol_annual: number;
    kelly_leverage: number;
    fractional_kelly: number;
    L_blend: number;
    max_drawdown: number;
  }>;
}

type Domain = [number, number] | ["auto", "auto"];

const RANGE_OPTIONS = [
  { key: "90d", label: "90日", days: 90 },
  { key: "180d", label: "180日", days: 180 },
  { key: "1y", label: "1年", days: 252 },
  { key: "max", label: "全期間" },
];

const fetchLeverageMetrics = async (): Promise<LeverageMetrics> => {
  const base = import.meta.env.BASE_URL ?? "/";
  const response = await fetch(`${base}data/metrics.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch leverage: ${response.status}`);

  const payload = (await response.json()) as { leverage?: LeverageMetrics };
  if (!payload.leverage) throw new Error("Leverage payload missing");

  return payload.leverage;
};

export const LeveragePanel = () => {
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: ["leverage"],
    queryFn: fetchLeverageMetrics,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (isError) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Leverage</h2>
            <p className="text-sm text-muted-foreground">Failed to load leverage metrics.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const [range, setRange] = useState<string>("180d");

  const series = useMemo(() => {
    if (!data) return [] as LeverageMetrics["series"];
    const end = new Date(data.as_of);
    const selected = RANGE_OPTIONS.find((r) => r.key === range);
    if (!selected || !selected.days) return data.series;
    const start = new Date(end);
    start.setDate(start.getDate() - selected.days);
    return data.series.filter((d) => new Date(d.date) >= start && new Date(d.date) <= end);
  }, [data, range]);

  const quantile = (values: number[], q: number) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  };

  const domainFor = (key: keyof LeverageMetrics["series"]): Domain => {
    const vals = series.map((d) => d[key]).filter((v) => Number.isFinite(v)) as number[];
    if (!vals.length) return ["auto", "auto"];
    const low = quantile(vals, 0.02);
    const high = quantile(vals, 0.98);
    if (low === high) {
      const padding = Math.abs(high) * 0.05 || 1;
      return [high - padding, high + padding];
    }
    return [Math.min(low, 0), high];
  };

  const priceDomain = domainFor("price_close");
  const volDomain = domainFor("volatility_score");
  const leverageDomain = domainFor("L_blend");

  if (!data || series.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blend提案</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.suggested.L_blend.toFixed(2)}x</div>
              <p className="text-xs text-muted-foreground">
                Kelly {data.suggested.L_kelly.toFixed(2)} / Vol {data.suggested.L_vol.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sortino</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.risk.sortino_ratio_annual.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Sharpe {data.sharpe_ratio_annual.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max DD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(data.risk.max_drawdown * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Calmar {data.risk.calmar_ratio.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ES 95%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(data.risk.es_95 * 100).toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">VoV {data.risk.vol_of_vol.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1 text-sm ${range === r.key ? "bg-primary text-primary-foreground shadow" : "bg-muted text-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Historical Analysis</h3>
          <p className="text-sm text-muted-foreground">レンジ: {range === "max" ? "全期間" : range} / データ点 {series.length}</p>
        </div>

        <div className="grid gap-6">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} />
                <YAxis domain={priceDomain} />
                <Tooltip formatter={(value: number) => value.toFixed(2)} />
                <Line type="monotone" dataKey="price_close" stroke="#2563eb" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} />
                <YAxis domain={volDomain} />
                <Tooltip formatter={(value: number) => value.toFixed(4)} />
                <Line type="monotone" dataKey="volatility_score" name="Vol Score" stroke="#dc2626" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="realized_vol_annual" name="Realized" stroke="#ea580c" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="ewma_vol_annual" name="EWMA" stroke="#9333ea" dot={false} strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} />
                <YAxis domain={leverageDomain} />
                <Tooltip formatter={(value: number) => value.toFixed(2)} />
                <ReferenceLine y={1} stroke="#666" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="L_blend" name="Blend" stroke="#16a34a" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="kelly_leverage" name="Kelly" stroke="#2563eb" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="fractional_kelly" name="Fractional" stroke="#0891b2" dot={false} strokeWidth={1} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
};
