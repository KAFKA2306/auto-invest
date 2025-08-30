import { writeFile } from "fs/promises";

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    console.error("GITHUB_REPOSITORY and GITHUB_TOKEN must be set");
    process.exit(1);
  }

  const url = `https://api.github.com/repos/${repo}/actions/runs?per_page=5`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "actions-status-fetcher",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    console.error(`Failed to fetch workflow runs: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const json = await res.json();
  const runs = json.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    created_at: run.created_at,
    html_url: run.html_url,
  }));
  await writeFile("public/data/actions.json", JSON.stringify(runs, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
