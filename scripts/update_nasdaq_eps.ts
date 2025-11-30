#!/usr/bin/env tsx
/**
 * Fetch bottom-up EPS data for NASDAQ-100 leaders using Yahoo Finance,
 * with a hook for future LLM/PDF fallback.
 */
import "dotenv/config";
import type { EpsRow } from "./bottom-up/types";
import { fetchConstituents } from "./bottom-up/constituents";
import { loadExisting, saveDataset } from "./bottom-up/storage";
import { fetchFromYahoo } from "./bottom-up/providers/yahoo";
import { fetchWithLLMFallback } from "./bottom-up/providers/gemini";
import { fetchWithSerper } from "./bottom-up/providers/serper";

const main = async () => {
  const existing = await loadExisting();
  const existingComponents =
    existing.components?.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      weight: c.weight ?? 0,
    })) ?? [];

  const constituents = await fetchConstituents(existingComponents);
  const rows: EpsRow[] = [];
  const marketCaps: Record<string, number | undefined> = {};

  for (const item of constituents) {
    try {
      const yahoo = await fetchFromYahoo(item.symbol);
      marketCaps[item.symbol] = yahoo.marketCap;
      rows.push({
        symbol: item.symbol,
        name: item.name,
        quarter: yahoo.quarter,
        eps: yahoo.eps,
        eps_yoy: yahoo.eps_yoy,
        weight: item.weight,
        source: yahoo.source,
      });
    } catch (err) {
      console.warn(`yfinance failed for ${item.symbol}: ${(err as Error).message}`);
      // fallback to previous file entry if available
      const prev = existing.components?.find((c) => c.symbol === item.symbol);
      if (prev) {
        rows.push({
          symbol: item.symbol,
          name: item.name,
          quarter: prev.quarter ?? "unknown",
          eps: prev.eps ?? 0,
          eps_yoy: prev.eps_yoy ?? null,
          weight: prev.weight ?? item.weight,
          source: prev.source ?? "prev-file",
        });
        marketCaps[item.symbol] = prev.marketCap;
        continue;
      }
      const fallbackSearch = await fetchWithSerper(item.symbol);
      if (fallbackSearch) {
        rows.push({
          symbol: item.symbol,
          name: item.name,
          quarter: fallbackSearch.quarter,
          eps: fallbackSearch.eps,
          eps_yoy: fallbackSearch.eps_yoy,
          weight: item.weight,
          source: fallbackSearch.source,
        });
        continue;
      }
      const fallback = await fetchWithLLMFallback(item.symbol);
      if (fallback) {
        rows.push({
          symbol: item.symbol,
          name: item.name,
          quarter: fallback.quarter,
          eps: fallback.eps,
          eps_yoy: fallback.eps_yoy,
          weight: item.weight,
          source: fallback.source,
        });
      }
    }
  }

  if (!rows.length) {
    throw new Error("No data collected; aborting.");
  }

  // Recompute weights from market cap if available
  const totalMcap = Object.values(marketCaps)
    .filter((v) => v && v > 0)
    .reduce((a, b) => (a ?? 0) + (b as number), 0) ?? 0;
  const weightedRows =
    totalMcap > 0
      ? rows.map((r) => ({
          ...r,
          weight:
            marketCaps[r.symbol] && marketCaps[r.symbol]! > 0
              ? (marketCaps[r.symbol]! as number) / totalMcap
              : r.weight,
        }))
      : rows;

  // Final normalization to make weights sum to 1
  const weightSum = weightedRows.reduce((s, r) => s + (r.weight ?? 0), 0) || 1;
  const normalizedRows = weightedRows.map((r) => ({ ...r, weight: (r.weight ?? 0) / weightSum }));

  await saveDataset(normalizedRows, existing);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
