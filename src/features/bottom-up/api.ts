import type { BottomUpDataset } from "./types";

const withCacheBust = (url: string) => `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;

const buildCandidateUrls = (): string[] => {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;

  // 1) Production GH Pages path (e.g. /auto-invest/data/...)
  const fromBase = `${normalizedBase}data/bottom_up_eps.json`;
  // 2) Root-relative fallback for dev server
  const rootRelative = "/data/bottom_up_eps.json";
  // 3) Route-relative fallback (in case base is empty)
  const routeRelative = "./data/bottom_up_eps.json";

  // Deduplicate while preserving order
  return Array.from(new Set([fromBase, rootRelative, routeRelative])).map(withCacheBust);
};

export const fetchBottomUpDataset = async (): Promise<BottomUpDataset> => {
  const errors: string[] = [];

  for (const url of buildCandidateUrls()) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text.slice(0, 80)}`);
      }
      return (await res.json()) as BottomUpDataset;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${url} → ${message}`);
    }
  }

  throw new Error(`Failed to fetch bottom-up EPS. Tried: ${errors.join(" | ")}`);
};
