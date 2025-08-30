import { useEffect, useState } from "react";

interface ActionRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

export const ActionsDashboard = () => {
  const [runs, setRuns] = useState<ActionRun[]>([]);

  useEffect(() => {
    fetch("/data/actions.json")
      .then((res) => res.json())
      .then((data: ActionRun[]) => setRuns(data))
      .catch(() => setRuns([]));
  }, []);

  if (runs.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-4">Latest Workflow Runs</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Status</th>
              <th className="p-2">Conclusion</th>
              <th className="p-2">Started</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b">
                <td className="p-2">
                  <a
                    href={run.html_url}
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {run.name}
                  </a>
                </td>
                <td className="p-2">{run.status}</td>
                <td className="p-2">{run.conclusion ?? "-"}</td>
                <td className="p-2">
                  {new Date(run.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
