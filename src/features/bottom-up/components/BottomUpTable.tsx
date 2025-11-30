import type { EditableComponent } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface BottomUpTableProps {
  rows: EditableComponent[];
  onChangeRow: (symbol: string, updates: Partial<EditableComponent>) => void;
}

const fmtPct = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? "—" : `${(value * 100).toFixed(digits)}%`;

export const BottomUpTable = ({ rows, onChangeRow }: BottomUpTableProps) => {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Ticker</TableHead>
              <TableHead>Quarter</TableHead>
              <TableHead>EPS (USD)</TableHead>
              <TableHead>EPS YoY</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead className="w-[120px]">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.symbol}>
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    <span>{row.symbol}</span>
                    <span className="text-xs text-muted-foreground">{row.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.quarter}</TableCell>
                <TableCell className="font-mono text-sm">{row.eps.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="-100"
                      max="500"
                      className="h-9 w-24"
                      value={
                        row.input_eps_yoy === null || row.input_eps_yoy === undefined
                          ? ""
                          : (row.input_eps_yoy * 100).toFixed(1)
                      }
                      onChange={(e) => {
                        const next = e.target.value;
                        onChangeRow(row.symbol, {
                          input_eps_yoy:
                            next === "" ? null : Number.parseFloat(next) / 100,
                        });
                      }}
                      placeholder="—"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    {row.eps_yoy === null || row.eps_yoy === undefined ? (
                      <Badge variant="secondary" className="text-[11px]">
                        fill to include
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px]">
                        prefills {fmtPct(row.eps_yoy)}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      max="100"
                      className="h-9 w-24"
                      value={(row.input_weight * 100).toFixed(1)}
                      onChange={(e) => {
                        const next = e.target.value;
                        onChangeRow(row.symbol, {
                          input_weight: next === "" ? 0 : Number.parseFloat(next) / 100,
                        });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row.source ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
        YoYとウェイトはいつでも上書きできます（自動換算は小数→%）。空欄の銘柄は加重計算に含めません。
      </div>
    </div>
  );
};
