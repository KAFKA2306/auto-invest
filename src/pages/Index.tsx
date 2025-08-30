import { PerformanceMetricsGrid } from "@/components/PerformanceMetrics";
import { ActionsDashboard } from "@/components/ActionsDashboard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Investment Performance</h1>
          <p className="text-neutral mt-2">Real-time performance metrics dashboard</p>
        </header>
        
        <main>
          <PerformanceMetricsGrid />
          <ActionsDashboard />
        </main>
      </div>
    </div>
  );
};

export default Index;
