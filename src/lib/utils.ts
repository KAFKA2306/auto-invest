import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmtPct = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? "—" : `${(value * 100).toFixed(digits)}%`;

export const fmtNumber = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined
    ? "—"
    : value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
