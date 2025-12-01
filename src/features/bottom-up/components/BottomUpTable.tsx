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
  // Get unique historical dates from the first row that has history to set column headers
  // Assumes all rows have similar history structure if available
  const historyDates = rows.find(r => r.history?.length)?.history?.map(h => h.date) || [];

  return (
    <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead className="w-[140px]">Ticker</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Latest EPS</TableHead>
              {historyDates.map((date) => (
                <TableHead key={date} className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {date}
                </TableHead>
              ))}
              <TableHead className="text-right">YoY Input</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const contribution = (row.input_weight || 0) * (row.input_eps_yoy || 0);
              
              return (
                <TableRow key={row.symbol} className="hover:bg-muted/50">
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div className="flex flex-col">
                      <span>{row.symbol}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        max="100"
                        className="h-8 w-16 text-right px-2 py-1 text-xs"
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
                  <TableCell className="text-right font-mono text-sm">
                    {row.eps.toFixed(2)}
                  </TableCell>
                  {historyDates.map((date) => {
                    const histItem = row.history?.find((h) => h.date === date);
                    return (
                      <TableCell key={date} className="text-right font-mono text-xs text-muted-foreground">
                        {histItem ? histItem.eps.toFixed(2) : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        className="h-8 w-16 text-right px-2 py-1 text-xs"
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
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.input_eps_yoy !== null ? fmtPct(contribution, 2) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
