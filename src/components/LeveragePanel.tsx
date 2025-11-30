import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
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

interface ValuationPoint {
  date: string;
  forward_pe: number;
  forward_eps: number;
  earnings_yield?: number;
  earnings_yield_spread?: number;
  implied_forward_pe_from_price?: number;
  price_close?: number;
  price_index?: number;
}

interface ValuationPayload {
  as_of: string;
  latest?: {
    forward_pe?: number;
    forward_eps?: number;
    earnings_yield?: number;
    earnings_yield_spread?: number;
    yoy_eps_growth?: number;
    implied_forward_pe_from_price?: number;
  };
  series: ValuationPoint[];
  source?: string;
}

type Domain = [number, number] | ["auto", "auto"];
type SeriesPoint = LeverageMetrics["series"][number];

const RANGE_OPTIONS = [
  { key: "90d", label: "90日", days: 90 },
  { key: "180d", label: "180日", days: 180 },
  { key: "1y", label: "1年", days: 252 },
  { key: "max", label: "全期間" },
];


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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const fetchLeverageMetrics = async (): Promise<LeverageMetrics> => {
  const base = import.meta.env.BASE_URL ?? "/";
  const response = await fetch(`${base}data/metrics.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch leverage: ${response.status}`);

  const payload = (await response.json()) as { leverage?: LeverageMetrics };
  if (!payload.leverage) throw new Error("Leverage payload missing");

  return payload.leverage;
};

const fetchValuation = async (): Promise<ValuationPayload> => {
  const apiBase = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
  const staticBase = import.meta.env.BASE_URL ?? "/";

  const tryFetch = async (url: string) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    return (await res.json()) as ValuationPayload;
  };

  try {
    const payload = await tryFetch(`${apiBase}/api/v1/valuation`);
    if (!payload.series) throw new Error("Valuation payload missing series");
    return payload;
  } catch {
    const payload = await tryFetch(`${staticBase}data/valuation.json`);
    if (!payload.series) throw new Error("Valuation payload missing series");
    return payload;
  }
};

export const LeveragePanel = () => {
  const { data, isError, refetch, isFetching, isLoading } = useQuery({
    queryKey: ["leverage"],
    queryFn: fetchLeverageMetrics,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const { data: valuationData } = useQuery({
    queryKey: ["valuation"],
    queryFn: fetchValuation,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

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



  const isAutoDomain = (domain: Domain): domain is ["auto", "auto"] =>
    typeof domain[0] === "string" || typeof domain[1] === "string";

  const quantileDomain = useCallback((
    values: number[],
    lowerQ = 0.02,
    upperQ = 0.98,
    minSpan = 0.1,
    clampMin?: number,
    clampMax?: number
  ): Domain => {
    const valid = values.filter((v) => Number.isFinite(v));
    if (!valid.length) return ["auto", "auto"];
    const lowQ = quantile(valid, lowerQ);
    const highQ = quantile(valid, upperQ);
    let low = lowQ - Math.abs(lowQ) * 0.05;
    let high = highQ + Math.abs(highQ) * 0.05;
    if (high - low < minSpan) {
      const mid = (low + high) / 2;
      low = mid - minSpan / 2;
      high = mid + minSpan / 2;
    }
    if (clampMin !== undefined) low = Math.max(clampMin, low);
    if (clampMax !== undefined) high = Math.min(clampMax, high);
    return [low, high];
  }, []);

  const plottedSeries = useMemo(
    () =>
      series.map((d) => ({
        ...d,
        L_blend_plot: clamp(d.L_blend, 0, 10),
        kelly_plot: clamp(d.kelly_leverage, 0, 10),
        fractional_plot: clamp(d.fractional_kelly, 0, 10),
        max_drawdown_plot: clamp(d.max_drawdown, -0.8, 0),
      })),
    [series]
  );

  const domainFor = (key: keyof SeriesPoint): Domain => {
    const vals = series.map((d) => d[key]).filter((v) => Number.isFinite(v)) as number[];
    if (!vals.length) return ["auto", "auto"];

    const mean = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    const variance =
      vals.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / (vals.length || 1);
    const std = Math.sqrt(variance);

    let low = mean - 3 * std;
    let high = mean + 3 * std;

    if (std === 0) {
      const padding = Math.abs(mean) * 0.05 || 1;
      low = mean - padding;
      high = mean + padding;
    }

    if (low === high) {
      low -= 1;
      high += 1;
    }

    return [low, high];
  };

  const valuationSeries = useMemo(() => {
    if (!valuationData) return [] as ValuationPoint[];
    const endDate = valuationData.as_of
      ? new Date(valuationData.as_of)
      : new Date(valuationData.series[valuationData.series.length - 1]?.date ?? Date.now());
    const selected = RANGE_OPTIONS.find((r) => r.key === range);
    if (!selected || !selected.days) return valuationData.series;
    const start = new Date(endDate);
    start.setDate(start.getDate() - selected.days);
    return valuationData.series.filter((d) => {
      const dt = new Date(d.date);
      return dt >= start && dt <= endDate;
    });
  }, [valuationData, range]);

  const priceChartData = useMemo(() => {
    if (!valuationSeries.length) return [];
    return valuationSeries
      .map((d) => ({ date: d.date, price: d.price_index }))
      .filter((d) => Number.isFinite(d.price as number));
  }, [valuationSeries]);

  // 価格統計はドメイン計算より先に評価する必要がある
  const priceStats = useMemo(() => {
    const prices = priceChartData.map((d) => d.price as number).filter((v) => v > 0);
    if (!prices.length) return { min: 1, max: 10 };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max };
  }, [priceChartData]);

  const priceDomain: Domain = (() => {
    const low = Math.max(0.5, priceStats.min * 0.9);
    const high = Math.max(low * 1.05, priceStats.max * 1.1);
    return [low, high];
  })();
  const volDomain = domainFor("volatility_score");
  const leverageDomain: Domain = (() => {
    if (!plottedSeries.length) return [0, 2];
    const maxVal = Math.max(
      0,
      ...plottedSeries.map((d) => d.L_blend_plot),
      ...plottedSeries.map((d) => d.kelly_plot),
      ...plottedSeries.map((d) => d.fractional_plot)
    );
    const minVal = Math.min(
      ...plottedSeries.map((d) => d.L_blend_plot),
      ...plottedSeries.map((d) => d.kelly_plot),
      ...plottedSeries.map((d) => d.fractional_plot)
    );
    let low = Math.max(0, minVal * 0.9);
    let high = Math.min(10, Math.max(low + 0.5, maxVal * 1.1));
    if (high - low < 0.5) {
      const pad = 0.25;
      low = Math.max(0, low - pad);
      high = Math.min(10, high + pad);
    }
    return [low, high];
  })();
  const drawdownDomain: Domain = (() => {
    if (!plottedSeries.length) return [-0.8, 0];
    const vals = plottedSeries.map((d) => d.max_drawdown_plot).filter((v) => Number.isFinite(v));
    if (!vals.length) return [-0.8, 0];

    const q02 = quantile(vals, 0.02);
    const q98 = quantile(vals, 0.98);

    let low = Math.min(q02 * 1.1, -0.02);
    let high = Math.min(0, q98 * 0.95);

    if (high - low < 0.05) {
      const mid = (low + high) / 2;
      low = mid - 0.03;
      high = mid + 0.03;
    }

    low = Math.max(-0.8, low);
    high = Math.min(0, high);
    if (high <= low) high = Math.min(0, low + 0.05);
    return [low, high];
  })();

  const makeTicks = (low: number, high: number) => {
    const span = Math.max(high - low, 1);
    const raw = span / 6;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const rel = raw / pow;
    const nice = rel >= 5 ? 5 : rel >= 2.5 ? 2.5 : rel >= 2 ? 2 : 1;
    const step = nice * pow;
    const start = Math.floor(low / step) * step;
    const ticks: number[] = [];
    for (let v = start; v <= high + step * 0.5; v += step) {
      if (v >= 0 && low > 0 && v < low) continue;
      ticks.push(Number(v.toFixed(2)));
    }
    return ticks.length ? ticks : [low, high];
  };

  const leverageTicks = useMemo(() => makeTicks(leverageDomain[0] as number, leverageDomain[1] as number), [leverageDomain]);
  const drawdownTicks = useMemo(() => makeTicks(drawdownDomain[0] as number, drawdownDomain[1] as number), [drawdownDomain]);

  const priceTicks = useMemo(() => {
    const ticks: number[] = [];
    const { min, max } = priceStats;
    const minPow = Math.floor(Math.log10(min));
    const maxPow = Math.ceil(Math.log10(max));
    for (let p = minPow; p <= maxPow; p += 1) {
      const base = 10 ** p;
      [1, 2, 5].forEach((m) => {
        const v = m * base;
        if (v >= min * 0.9 && v <= max * 1.1) ticks.push(v);
      });
    }
    let candidates = Array.from(new Set(ticks)).sort((a, b) => a - b);

    if (candidates.length < 4) {
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const evenTicks = Array.from({ length: 4 }, (_, i) =>
        10 ** (logMin + ((logMax - logMin) / 3) * i)
      );
      candidates = Array.from(new Set([...candidates, ...evenTicks, min, max])).sort(
        (a, b) => a - b
      );
    }

    if (candidates.length > 8) {
      const step = Math.ceil(candidates.length / 8);
      candidates = candidates.filter((_, idx) => idx % step === 0);
    }

    while (candidates.length < 4 && candidates.length < 8) {
      candidates.push(max * (1 + candidates.length * 0.01));
    }

    return candidates;
  }, [priceStats]);

  const peDomain = useMemo(
    () => quantileDomain(valuationSeries.map((d) => d.forward_pe), 0.02, 0.98, 1, 0),
    [valuationSeries, quantileDomain]
  );
  const epsDomain = useMemo(
    () => quantileDomain(valuationSeries.map((d) => d.forward_eps), 0.02, 0.98, 0.5),
    [valuationSeries, quantileDomain]
  );
  const yieldDomain = useMemo(
    () =>
      quantileDomain(
        valuationSeries.map((d) =>
          d.earnings_yield_spread !== undefined ? d.earnings_yield_spread : Number.NaN
        ),
        0.02,
        0.98,
        0.01
      ),
    [valuationSeries, quantileDomain]
  );

  const peTicks = useMemo(
    () =>
      isAutoDomain(peDomain) ? undefined : makeTicks(peDomain[0] as number, peDomain[1] as number),
    [peDomain]
  );
  const epsTicks = useMemo(
    () =>
      isAutoDomain(epsDomain) ? undefined : makeTicks(epsDomain[0] as number, epsDomain[1] as number),
    [epsDomain]
  );
  const yieldTicks = useMemo(
    () =>
      isAutoDomain(yieldDomain)
        ? undefined
        : makeTicks(yieldDomain[0] as number, yieldDomain[1] as number),
    [yieldDomain]
  );

  const valuationLatest = valuationData?.latest;

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!data || series.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <div className="text-sm text-muted-foreground">No data available.</div>
      </div>
    );
  }

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

        <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground">計算定義</div>
          <div>推奨レバ (Blend) = min(cap, α·Kelly理論レバ + (1-α)·Volターゲット)。α={data.suggested.alpha.toFixed(2)}, cap={data.suggested.cap}x。</div>
          <div>Kelly理論レバ = (超過収益率) ÷ 分散、分割Kelly = min(cap, fraction·Kelly)。</div>
          <div>Volターゲット = 目標ボラ20% ÷ 実現ボラ、Max DD = 期間内累積のピーク比下落。</div>
        </div>

        <div className="grid gap-6">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceChartData}>
                <text x="50%" y={18} textAnchor="middle" className="fill-foreground text-sm">指数価格推移</text>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} label={{ value: "日付", position: "insideBottom", offset: -6 }} />
                <YAxis
                  scale="log"
                  domain={priceDomain}
                  ticks={priceTicks}
                  label={{ value: "指数価格(USD, 対数)", angle: -90, position: "insideLeft" }}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  allowDataOverflow
                />
                <Tooltip formatter={(value: number) => value.toFixed(2)} />
                <Line type="monotone" dataKey="price" stroke="#2563eb" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plottedSeries}>
                <text x="50%" y={18} textAnchor="middle" className="fill-foreground text-sm">ボラティリティ</text>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} label={{ value: "日付", position: "insideBottom", offset: -6 }} />
                <YAxis
                  domain={volDomain}
                  tickCount={6}
                  label={{ value: "年率ボラ(σ)", angle: -90, position: "insideLeft" }}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />
                <Tooltip formatter={(value: number) => value.toFixed(3)} />
                <Line type="monotone" dataKey="volatility_score" name="Vol Score" stroke="#dc2626" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="realized_vol_annual" name="Realized" stroke="#ea580c" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="ewma_vol_annual" name="EWMA" stroke="#9333ea" dot={false} strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plottedSeries}>
                <text x="50%" y={18} textAnchor="middle" className="fill-foreground text-sm">最大ドローダウン</text>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} label={{ value: "日付", position: "insideBottom", offset: -6 }} />
                <YAxis
                  domain={drawdownDomain}
                  ticks={drawdownTicks}
                  label={{ value: "最大DD(%)", angle: -90, position: "insideLeft" }}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="max_drawdown" name="Max DD" stroke="#ef4444" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plottedSeries}>
                <text x="50%" y={18} textAnchor="middle" className="fill-foreground text-sm">レバレッジ推奨</text>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} label={{ value: "日付", position: "insideBottom", offset: -6 }} />
                <YAxis
                  domain={leverageDomain}
                  ticks={leverageTicks}
                  label={{ value: "レバレッジ(x)", angle: -90, position: "insideLeft" }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip formatter={(value: number) => value.toFixed(2)} />
                <ReferenceLine y={1} stroke="#666" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="L_blend_plot" name="推奨レバ (Blend)" stroke="#16a34a" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="kelly_plot" name="Kelly理論レバ" stroke="#2563eb" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="fractional_plot" name="分割Kellyレバ" stroke="#0891b2" dot={false} strokeWidth={1} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {valuationSeries.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Valuation</h3>
              <p className="text-sm text-muted-foreground">NASDAQ-100 Forward P/E と Forward 12M EPS に基づくバリュエーション指標</p>
              {valuationLatest && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Forward P/E: {valuationLatest.forward_pe !== undefined ? valuationLatest.forward_pe.toFixed(2) : "–"}</span>
                  <span>Forward EPS: {valuationLatest.forward_eps !== undefined ? valuationLatest.forward_eps.toFixed(2) : "–"}</span>
                  <span>イールドスプレッド: {valuationLatest.earnings_yield_spread !== undefined ? `${(valuationLatest.earnings_yield_spread * 100).toFixed(1)}%` : "–"}</span>
                  <span>EPS成長率(YoY): {valuationLatest.yoy_eps_growth !== undefined ? `${(valuationLatest.yoy_eps_growth * 100).toFixed(1)}%` : "–"}</span>
                </div>
              )}
            </div>

            <div className="grid gap-6">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={valuationSeries}>
                    <text x="50%" y={18} textAnchor="middle" className="fill-foreground text-sm">Forward P/E & EPS</text>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} label={{ value: "日付", position: "insideBottom", offset: -6 }} />
                    <YAxis
                      yAxisId="pe"
                      domain={peDomain}
                      ticks={peTicks}
                      label={{ value: "Forward P/E", angle: -90, position: "insideLeft" }}
                      tickFormatter={(v: number) => v.toFixed(1)}
                      allowDataOverflow
                    />
                    <YAxis
                      yAxisId="eps"
                      orientation="right"
                      domain={epsDomain}
                      ticks={epsTicks}
                      label={{ value: "Forward EPS", angle: 90, position: "insideRight" }}
                      tickFormatter={(v: number) => v.toFixed(1)}
                    />
                    <Tooltip formatter={(value: number) => value.toFixed(2)} />
                    <Line yAxisId="pe" type="monotone" dataKey="forward_pe" name="Forward P/E" stroke="#7c3aed" dot={false} strokeWidth={2} />
                    <Line yAxisId="pe" type="monotone" dataKey="implied_forward_pe_from_price" name="Implied P/E" stroke="#14b8a6" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                    <Line yAxisId="eps" type="monotone" dataKey="forward_eps" name="Forward EPS" stroke="#ea580c" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={valuationSeries}>
                    <text x="50%" y={18} textAnchor="middle" className="fill-foreground text-sm">イールドスプレッド</text>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tickFormatter={(val) => val.slice(0, 7)} minTickGap={30} label={{ value: "日付", position: "insideBottom", offset: -6 }} />
                    <YAxis
                      domain={yieldDomain}
                      ticks={yieldTicks}
                      label={{ value: "Earn. Yield - Rf", angle: -90, position: "insideLeft" }}
                      tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                    />
                    <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="earnings_yield_spread" name="Earnings Yield - Rf" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="earnings_yield" name="Earnings Yield" stroke="#10b981" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
