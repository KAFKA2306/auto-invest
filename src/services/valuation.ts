import type { ValuationPayload } from "@/types/valuation";

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return (await res.json()) as T;
};

export const fetchValuation = async (): Promise<ValuationPayload> => {
  const apiBase = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
  const staticBase = import.meta.env.BASE_URL ?? "/";

  try {
    const payload = await fetchJson<ValuationPayload>(`${apiBase}/api/v1/valuation`);
    if (!payload.series) throw new Error("Valuation payload missing series");
    return payload;
  } catch {
    const payload = await fetchJson<ValuationPayload>(`${staticBase}data/valuation.json`);
    if (!payload.series) throw new Error("Valuation payload missing series");
    return payload;
  }
};
