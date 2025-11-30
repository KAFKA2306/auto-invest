import { PerformanceMetricsGrid } from "@/components/PerformanceMetrics";
import { LeveragePanel } from "@/components/LeveragePanel";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container mx-auto max-w-6xl space-y-10 py-10">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Investment Performance</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Real-time performance metrics, financial intelligence, and workflow visibility stitched together for
            the current trading session.
          </p>
        </header>

        <main>
          <div className="space-y-10">
            <PerformanceMetricsGrid />
            <LeveragePanel />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
