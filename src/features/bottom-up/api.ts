import { z } from "zod";
import type { BottomUpDataset } from "./types";

const EpsComponentSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  quarter: z.string(),
  eps: z.number(),
  eps_yoy: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  source: z.string().optional(),
  history: z.array(z.object({ date: z.string(), eps: z.number() })).optional(),
}).passthrough();

const BottomUpDatasetSchema = z.object({
  as_of: z.string(),
  prior_period: z.object({
    date: z.string(),
    label: z.string(),
    eps: z.number(),
  }),
  base_period: z.object({
    date: z.string(),
    label: z.string(),
    eps: z.number(),
  }),
  components: z.array(EpsComponentSchema),
});

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
      const json = await res.json();
      const result = BottomUpDatasetSchema.safeParse(json);
      
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
        throw new Error(`Schema validation failed: ${errorMsg}`);
      }
      
      return result.data as BottomUpDataset;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${url} → ${message}`);
    }
  }

  throw new Error(`Failed to fetch bottom-up EPS. Tried: ${errors.join(" | ")}`);
};
