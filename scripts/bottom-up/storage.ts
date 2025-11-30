import fs from "node:fs/promises";
import path from "node:path";
import type { EpsRow, ExistingDataset } from "./types";

export const loadExisting = async (): Promise<ExistingDataset> => {
  const file = path.join(process.cwd(), "public/data/bottom_up_eps.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as ExistingDataset;
  } catch {
    return {};
  }
};

export const saveDataset = async (rows: EpsRow[], existing: ExistingDataset) => {
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
