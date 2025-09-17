import { writeFile } from "fs/promises";

const OUTPUT_PATH = "public/data/actions.json";

async function writeRuns(runs) {
  await writeFile(OUTPUT_PATH, JSON.stringify(runs, null, 2));
}

async function writeFallback(reason) {
  console.warn(
    `[actions-status] ${reason}. Writing empty workflow run list to ${OUTPUT_PATH}.`,
  );
  await writeRuns([]);
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    await writeFallback("GITHUB_REPOSITORY and GITHUB_TOKEN are not set");
    return;
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
    await writeFallback(
      `Failed to fetch workflow runs (${res.status} ${res.statusText})`,
    );
    return;
  }

  const json = await res.json();
  const runs = Array.isArray(json.workflow_runs)
    ? json.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        created_at: run.created_at,
        html_url: run.html_url,
      }))
    : [];

  if (!Array.isArray(json.workflow_runs)) {
    console.warn(
      "[actions-status] API response did not contain a workflow_runs array. Writing empty workflow run list.",
    );
  }

  await writeRuns(runs);
}

main().catch(async (err) => {
  console.error("[actions-status] Unexpected error while fetching workflow runs:", err);
  const message =
    err instanceof Error
      ? `Unexpected error: ${err.message}`
      : `Unexpected non-error rejection: ${JSON.stringify(err)}`;
  await writeFallback(message);
});
