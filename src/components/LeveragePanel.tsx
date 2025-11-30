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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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

const fetchLeverageMetrics = async (): Promise<LeverageMetrics> => {
  const response = await fetch(`/data/metrics.json?t=${new Date().getTime()}`);
  if (!response.ok) throw new Error("Failed to load metrics");
  const data = await response.json();
  return data.leverage;
};

export const LeveragePanel = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leverage"],
    queryFn: fetchLeverageMetrics,
  });

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load leverage metrics.
          {error instanceof Error ? ` ${error.message}` : ""}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suggested Leverage (L_blend)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.suggested.L_blend.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">
              Kelly: {data.suggested.L_kelly.toFixed(2)}x / Vol: {data.suggested.L_vol.toFixed(2)}x
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sortino Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.risk.sortino_ratio_annual.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Sharpe: {data.sharpe_ratio_annual.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(data.risk.max_drawdown * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Calmar: {data.risk.calmar_ratio.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Shortfall (95%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(data.risk.es_95 * 100).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              VoV: {data.risk.vol_of_vol.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="price" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Historical Analysis</h3>
            <TabsList>
              <TabsTrigger value="price">Price</TabsTrigger>
              <TabsTrigger value="volatility">Volatility</TabsTrigger>
              <TabsTrigger value="leverage">Leverage</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="price" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => val.slice(0, 7)}
                  minTickGap={30}
                />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="price_close" 
                  stroke="#2563eb" 
                  dot={false} 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="volatility" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => val.slice(0, 7)}
                  minTickGap={30}
                />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="volatility_score" 
                  name="Vol Score"
                  stroke="#dc2626" 
                  dot={false} 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="realized_vol_annual" 
                  name="Realized"
                  stroke="#ea580c" 
                  dot={false} 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="ewma_vol_annual" 
                  name="EWMA"
                  stroke="#9333ea" 
                  dot={false} 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="leverage" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => val.slice(0, 7)}
                  minTickGap={30}
                />
                <YAxis domain={[0, 4]} />
                <Tooltip />
                <ReferenceLine y={1} stroke="#666" strokeDasharray="3 3" />
                <Line 
                  type="monotone" 
                  dataKey="L_blend" 
                  name="Suggested (Blend)"
                  stroke="#16a34a" 
                  dot={false} 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="kelly_leverage" 
                  name="Kelly"
                  stroke="#2563eb" 
                  dot={false} 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="fractional_kelly" 
                  name="Fractional"
                  stroke="#0891b2" 
                  dot={false} 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
