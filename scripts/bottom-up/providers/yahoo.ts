import YahooFinance from "yahoo-finance2";
import { quarterLabel, findYoy } from "../utils";

const yahooFinance = new YahooFinance();

export const fetchFromYahoo = async (symbol: string) => {
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
