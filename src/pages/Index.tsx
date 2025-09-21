import { PerformanceMetricsGrid } from "@/components/PerformanceMetrics";
import { ActionsDashboard } from "@/components/ActionsDashboard";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Investment Performance</h1>
          <p className="text-neutral mt-2">Real-time performance metrics and financial analysis dashboard</p>
        </header>

        <main>
          <Tabs defaultValue="performance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="financial">Financial News</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="performance">
              <PerformanceMetricsGrid />
            </TabsContent>

            <TabsContent value="financial">
              <FinancialDashboard />
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
