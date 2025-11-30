import { PerformanceMetricsGrid } from "@/components/PerformanceMetrics";
import { ActionsDashboard } from "@/components/ActionsDashboard";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { LeveragePanel } from "@/components/LeveragePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          <Tabs defaultValue="performance" className="space-y-8">
            <TabsList className="grid w-full max-w-xl grid-cols-3 rounded-full bg-muted/70 p-1.5">
              <TabsTrigger
                value="performance"
                className="rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Performance
              </TabsTrigger>
              <TabsTrigger
                value="financial"
                className="rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Financial News
              </TabsTrigger>
              <TabsTrigger
                value="leverage"
                className="rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Leverage
              </TabsTrigger>
              <TabsTrigger
                value="actions"
                className="rounded-full px-4 py-2 text-sm font-medium transition data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Actions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="performance">
              <PerformanceMetricsGrid />
            </TabsContent>

            <TabsContent value="financial">
              <FinancialDashboard />
            </TabsContent>

            <TabsContent value="leverage">
              <LeveragePanel />
            </TabsContent>

            <TabsContent value="actions">
              <ActionsDashboard />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Index;
