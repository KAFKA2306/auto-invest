import type { BottomUpAggregate, BottomUpDataset, EditableComponent } from "./types";

export const buildEditableComponents = (dataset: BottomUpDataset): EditableComponent[] =>
  dataset.components.map((component) => ({
    ...component,
    input_weight: component.weight ?? 0,
    input_eps_yoy: component.eps_yoy ?? null,
  }));

export const calculateAggregate = (
  rows: EditableComponent[],
  priorEps?: number
): BottomUpAggregate => {
  const totalWeight = rows.reduce((sum, r) => sum + (r.input_weight || 0), 0);
  const activeRows = rows.filter((r) => Number.isFinite(r.input_eps_yoy));
  const activeWeight = activeRows.reduce((sum, r) => sum + (r.input_weight || 0), 0);
  const coverage = totalWeight > 0 ? activeWeight / totalWeight : 0;

  // Calculate contribution for each active row (for display/debugging if needed, though not returned in aggregate)
  // Note: The caller might want the rows with contributions, but here we just return the aggregate.
  // If we want to return rows with contributions, we should update the return type or do it in the component.
  // For now, let's just calculate the aggregate.

  const weightedSum = activeRows.reduce(
    (sum, r) => sum + (r.input_weight || 0) * (r.input_eps_yoy ?? 0),
    0
  );

  // Weighted Average Growth (Implied Index Growth)
  // If coverage is 0, growth is 0.
  const weightedAverageGrowth = activeWeight > 0 ? weightedSum / activeWeight : 0;

  const projectedEps =
    priorEps !== undefined ? priorEps * (1 + weightedAverageGrowth) : null;

  return {
    totalWeight,
    activeWeight,
    coverage,
    weightedAverageGrowth,
    projectedEps,
  };
};
