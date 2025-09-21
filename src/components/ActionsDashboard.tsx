import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";

interface ActionRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at?: string;
  html_url: string;
}

const fetchWorkflowRuns = async (): Promise<ActionRun[]> => {
  const response = await fetch("/data/actions.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch workflow runs");
  }

  return (await response.json()) as ActionRun[];
};

export const ActionsDashboard = () => {
  const {
    data: runs,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["actions-runs"],
    queryFn: fetchWorkflowRuns,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const sortedRuns = useMemo(() => {
    if (!runs) return [] as ActionRun[];
    return [...runs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [runs]);

  const lastRunTimestamp = sortedRuns[0]?.updated_at ?? sortedRuns[0]?.created_at ?? null;

  if (isLoading) {
    return (
      <section className="mt-12 space-y-4">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mt-12">
        <Alert variant="destructive" className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5" />
            <div>
              <AlertTitle>Unable to read workflow history</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "The GitHub Actions summary could not be loaded."}
              </AlertDescription>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </Alert>
      </section>
    );
  }

  return (
    <section className="mt-12 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Latest Workflow Runs</h2>
        <div className="flex items-center gap-3">
          <LastUpdatedBadge
            lastUpdated={lastRunTimestamp}
            staleAfterMs={1000 * 60 * 60 * 12}
            isRefreshing={isFetching}
          />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {sortedRuns.length === 0 ? (
        <Alert>
          <AlertTitle>No recent pipeline activity</AlertTitle>
          <AlertDescription>
            We have not recorded any GitHub Actions runs yet. Kick off the workflow from the Actions tab
            or run <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run financial:pipeline</code> to
            generate fresh data.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Conclusion</th>
                <th className="p-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {sortedRuns.map((run) => (
                <tr key={run.id} className="border-t">
                  <td className="p-3">
                    <a
                      href={run.html_url}
                      className="text-blue-600 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {run.name}
                    </a>
                  </td>
                  <td className="p-3 capitalize">{run.status.replace(/_/g, ' ')}</td>
                  <td className="p-3 capitalize">{run.conclusion ? run.conclusion.replace(/_/g, ' ') : '-'}</td>
                  <td className="p-3 whitespace-nowrap">
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
