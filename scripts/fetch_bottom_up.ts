#!/usr/bin/env tsx
/**
 * Fetch bottom-up EPS data for NASDAQ-100 leaders using Yahoo Finance,
 * with a hook for future LLM/PDF fallback.
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import YahooFinance from "yahoo-finance2";
import axios from "axios";
import * as cheerio from "cheerio";

type ComponentInput = {
  symbol: string;
  name: string;
  weight: number;
};

type ExistingDataset = {
  prior_period?: { date: string; label: string; eps: number };
  base_period?: { date: string; label: string; eps: number };
};

type EpsRow = {
  symbol: string;
  name: string;
  quarter: string;
  eps: number;
  eps_yoy: number | null;
  weight: number;
  source: string;
  marketCap?: number;
};

const yahooFinance = new YahooFinance();

const quarterLabel = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} Q${q}`;
};

const fetchConstituents = async (fallbackFromFile: ComponentInput[] = []): Promise<ComponentInput[]> => {
  try {
    const html = (
      await axios.get("https://en.wikipedia.org/wiki/Nasdaq-100", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; kafka-bot/1.0)" },
      })
    ).data;
    const $ = cheerio.load(html);
    // Wikipedia table containing Ticker / Company
    const table = $("table").filter((_, el) => {
      const header = $(el).find("tr").first().text();
      return /Ticker/.test(header) && /Company/.test(header);
    }).first();

    const rows: ComponentInput[] = [];
    table.find("tbody tr").each((_, tr) => {
      const t = $(tr).find("td").first().text().trim();
      const n = $(tr).find("td").eq(1).text().trim();
      if (!t || !n) return;
      const symbol = t.replace(".", "-");
      rows.push({ symbol, name: n, weight: 0 });
    });

    if (!rows.length) throw new Error("No constituents parsed");
    const dedup = Array.from(new Map(rows.map((r) => [r.symbol, r])).values());
    const w = 1 / dedup.length;
    return dedup.map((r) => ({ ...r, weight: w }));
  } catch (err) {
    console.warn("Failed to fetch constituents; using previous file or core list", err);
    if (fallbackFromFile.length) return fallbackFromFile;
    // Minimal fallback (Magnificent 7 + friends)
    const fallback: ComponentInput[] = [
      { symbol: "MSFT", name: "Microsoft", weight: 0.089 },
      { symbol: "AAPL", name: "Apple", weight: 0.086 },
      { symbol: "NVDA", name: "NVIDIA", weight: 0.075 },
      { symbol: "AMZN", name: "Amazon", weight: 0.055 },
      { symbol: "GOOGL", name: "Alphabet", weight: 0.05 },
      { symbol: "META", name: "Meta Platforms", weight: 0.039 },
      { symbol: "TSLA", name: "Tesla", weight: 0.025 },
      { symbol: "AMD", name: "Advanced Micro Devices", weight: 0.015 },
      { symbol: "AVGO", name: "Broadcom", weight: 0.03 },
      { symbol: "NFLX", name: "Netflix", weight: 0.014 },
      { symbol: "INTC", name: "Intel", weight: 0.01 },
    ];
    return fallback;
  }
};

const findYoy = (history: { date: Date; eps: number; period?: string }[]) => {
  // Prefer Yahoo's period flag "-4q" if present, else fall back to date delta.
  const latest = history[0];
  if (!latest) return null;
  const direct = history.find((h) => h.period === "-4q" || h.period === "4q");
  if (direct && direct !== latest) return direct;

  const target = new Date(latest.date);
  target.setFullYear(target.getFullYear() - 1);
  const match = history.find((h) => Math.abs(h.date.getTime() - target.getTime()) < 75 * 24 * 3600 * 1000);
  return match ?? null;
};

const fetchFromYahoo = async (symbol: string) => {
  const res = await yahooFinance.quoteSummary(symbol, { modules: ["earningsHistory", "price"] });
  const history = res.earningsHistory?.history;
  if (!history?.length) throw new Error(`No earningsHistory for ${symbol}`);

  const normalized = history
    .filter((h) => h.quarter && typeof h.epsActual === "number")
    .map((h) => ({
      date: new Date(h.quarter as unknown as string),
      eps: Number(h.epsActual),
      period: typeof h.period === "string" ? h.period : undefined,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  if (!normalized.length) throw new Error(`No parsable EPS for ${symbol}`);
  const latest = normalized[0];
  const yoy = findYoy(normalized);
  const eps_yoy = yoy ? (latest.eps - yoy.eps) / yoy.eps : null;

  const marketCap =
    typeof res.price?.marketCap === "number" ? Number(res.price.marketCap) : undefined;

  return {
    quarter: quarterLabel(latest.date),
    eps: latest.eps,
    eps_yoy,
    marketCap,
    source: "yfinance",
  };
};

// LLM fallback using Gemini Flash (best-effort). Expects .env GEMINI_API_KEY.
const fetchWithLLMFallback = async (symbol: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  if (!apiKey) {
    console.info(`Gemini skip: no GEMINI_API_KEY for ${symbol}`);
    return null;
  }

  const prompt = [
    "You are a financial extraction agent.",
    `Goal: return latest reported quarterly diluted EPS (USD) and YoY growth for ticker ${symbol}.`,
    "Output strict JSON with keys: quarter (e.g., 2025 Q3), eps (number), eps_yoy (number or null), source (short string).",
    "If unsure, return null.",
  ].join("\n");

  try {
    console.info(`Gemini fallback call for ${symbol} using model ${model}`);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini response ${res.status}`);
    const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No LLM content");
    const parsed = JSON.parse(text);
    if (!parsed.quarter || typeof parsed.eps !== "number") throw new Error("Incomplete LLM data");
    return {
      quarter: parsed.quarter,
      eps: parsed.eps,
      eps_yoy: typeof parsed.eps_yoy === "number" ? parsed.eps_yoy : null,
      source: parsed.source ?? "gemini-1.5-flash",
    };
  } catch (err) {
    console.warn(`Gemini fallback failed for ${symbol}: ${(err as Error).message}`);
    return null;
  }
};

// Web search + simple scrape fallback (Serper). Requires SERPER_API_KEY. Very best-effort.
const fetchWithSerper = async (symbol: string) => {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    console.info(`Serper skip: no SERPER_API_KEY for ${symbol}`);
    return null;
  }
  try {
    const searchRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": serperKey,
      },
      body: JSON.stringify({ q: `${symbol} earnings diluted EPS` }),
    });
    if (!searchRes.ok) throw new Error(`Serper search ${searchRes.status}`);
    const searchJson = (await searchRes.json()) as { organic?: { link?: string }[] };
    const results = searchJson.organic ?? [];
    for (const r of results.slice(0, 3)) {
      const url = r.link as string;
      if (!url) continue;
      try {
        const html = await (await fetch(url)).text();
        // crude EPS regex: $1.23 or 1.23 per share
        const m = html.match(/EPS[^\d$]{0,15}(\$?\d+\.\d+)/i);
        if (!m) continue;
        const eps = Number.parseFloat(m[1].replace("$", ""));
        if (!Number.isFinite(eps)) continue;
        // crude quarter extraction
        const qm = html.match(/(FY)?\s?(20\d{2})[-/\s]?(Q[1-4])/i);
        const quarter = qm ? `${qm[2]} ${qm[3].toUpperCase()}` : "latest";
        return { quarter, eps, eps_yoy: null, source: "serper-scrape" };
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.warn(`Serper fallback failed for ${symbol}: ${(err as Error).message}`);
  }
  return null;
};

const loadExisting = async (): Promise<ExistingDataset> => {
  const file = path.join(process.cwd(), "public/data/bottom_up_eps.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as ExistingDataset;
  } catch {
    return {};
  }
};

const saveDataset = async (rows: EpsRow[], existing: ExistingDataset) => {
  const out = {
    as_of: new Date().toISOString().slice(0, 10),
    prior_period:
      existing.prior_period ?? {
        date: "2024-12-31",
        label: "Nasdaq-100 EPS (TTM) 2024-12",
        eps: 601.591,
      },
    base_period:
      existing.base_period ?? {
        date: "2025-09-30",
        label: "Nasdaq-100 EPS (TTM) 2025-09",
        eps: 738.297,
      },
    components: rows,
  };

  const file = path.join(process.cwd(), "public/data/bottom_up_eps.json");
  await fs.writeFile(file, JSON.stringify(out, null, 2));
  console.log(`✅ wrote ${file} with ${rows.length} components`);
};

const main = async () => {
  const existing = await loadExisting();
  const existingComponents =
    (existing as { components?: { symbol: string; name: string; weight?: number }[] })?.components?.map((c) => ({
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
      const prev = (existing as { components?: EpsRow[] })?.components?.find((c) => c.symbol === item.symbol);
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
