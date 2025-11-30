import fs from "node:fs/promises";
import path from "node:path";

export const readCsv = async (filePath: string): Promise<Record<string, string>[]> => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j]?.trim() ?? "";
      }
      data.push(row);
    }
    return data;
  } catch (error) {
    console.warn(`Failed to read CSV ${filePath}:`, error);
    return [];
  }
};

export const writeCsv = async (filePath: string, data: Record<string, any>[]) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const val = row[header];
        if (val instanceof Date) return val.toISOString().split("T")[0];
        return String(val);
      }).join(",")
    ),
  ].join("\n");

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, csvContent);
};

export const writeJson = async (filePath: string, data: any) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};
