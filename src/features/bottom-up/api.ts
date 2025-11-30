import type { BottomUpDataset } from "./types";

export const fetchBottomUpDataset = async (): Promise<BottomUpDataset> => {
  const base = import.meta.env.BASE_URL ?? "/";
  const res = await fetch(`${base}data/bottom_up_eps.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch bottom-up EPS: ${res.status}`);
  return (await res.json()) as BottomUpDataset;
};
