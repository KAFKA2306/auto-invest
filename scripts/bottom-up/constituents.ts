import axios from "axios";
import * as cheerio from "cheerio";
import type { ComponentInput } from "./types";

export const fetchConstituents = async (fallbackFromFile: ComponentInput[] = []): Promise<ComponentInput[]> => {
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
