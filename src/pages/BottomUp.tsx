import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomUpTable } from "@/features/bottom-up/components/BottomUpTable";
import { BottomUpSummary } from "@/features/bottom-up/components/BottomUpSummary";
import { fetchBottomUpDataset } from "@/features/bottom-up/api";
import { buildEditableComponents, calculateAggregate } from "@/features/bottom-up/usecases";
import type { EditableComponent } from "@/features/bottom-up/types";
import { fetchValuation } from "@/services/valuation";

const BottomUp = () => {
  const { data: dataset, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["bottom-up-dataset"],
    queryFn: fetchBottomUpDataset,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: valuationData } = useQuery({
    queryKey: ["valuation"],
    queryFn: fetchValuation,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [rows, setRows] = useState<EditableComponent[]>([]);

  useEffect(() => {
    if (dataset) {
      setRows(buildEditableComponents(dataset));
    }
  }, [dataset]);

  const aggregate = useMemo(
    () => calculateAggregate(rows, dataset?.prior_period.eps),
    [rows, dataset]
  );

  const topDownForwardEps = valuationData?.latest?.forward_eps ?? dataset?.base_period.eps;

  const handleChangeRow = (symbol: string, updates: Partial<EditableComponent>) => {
    setRows((prev) =>
      prev.map((row) => (row.symbol === symbol ? { ...row, ...updates } : row))
    );
  };

  const handleReset = () => {
    if (dataset) setRows(buildEditableComponents(dataset));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container mx-auto max-w-6xl space-y-6 py-10">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      </div>
    );
  }

  if (isError || !dataset) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container mx-auto max-w-4xl space-y-4 py-10">
          <h1 className="text-3xl font-semibold text-foreground">Bottom-up EPS</h1>
          <Card>
            <CardContent className="flex items-center justify-between py-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">データを読み込めませんでした。</p>
                <p className="text-xs text-muted-foreground">public/data/bottom_up_eps.json を確認してください。</p>
              </div>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container mx-auto max-w-6xl space-y-10 py-10">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              NASDAQ-100 Bottom-up EPS
            </h1>
            <Badge variant="secondary" className="text-xs">
              {dataset.as_of}
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            マグニフィセント7＋主要銘柄の最新決算 EPS と YoY をウェイトで合成し、インデックス EPS のボトムアップ成長率を即時計算。
            トップダウン（forward EPS / P E）との突き合わせもワンクリック。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link to="/">Back to top-down</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Prefill reset
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              Refresh static data
            </Button>
          </div>
        </header>

        <main className="space-y-8">
          <BottomUpSummary
            aggregate={aggregate}
            dataset={dataset}
            topDownForwardEps={topDownForwardEps}
          />

          <BottomUpTable rows={rows} onChangeRow={handleChangeRow} />

          <Card className="border-border/70 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">How the bridge works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="leading-relaxed">
                1) 銘柄ごとの YoY をウェイト（%）で加重し、指数 EPS の YoY を作成。2) 直近の{" "}
                {dataset.prior_period.label} をベースに (1 + YoY) を掛け合わせて
                2025-12（想定）のボトムアップ EPS を推計。3) 直近トップダウン forward EPS{" "}
                {topDownForwardEps?.toFixed(1)} と比較し、上振れ/下振れを把握。
              </div>
              <div className="leading-relaxed">
                YoY 未入力の銘柄は計算から除外し、Coverage に反映します。ウェイトは自由入力（自動で合計に対して正規化）なので、
                市場シェアや時価総額ウェイトに合わせて調整してください。
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default BottomUp;
