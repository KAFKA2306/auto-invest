export const fetchWithSerper = async (symbol: string) => {
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
