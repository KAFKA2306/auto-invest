export const fetchWithLLMFallback = async (symbol: string) => {
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
