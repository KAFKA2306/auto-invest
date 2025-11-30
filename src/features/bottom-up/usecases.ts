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

  const weightedGrowth =
    totalWeight > 0
      ? activeRows.reduce(
          (sum, r) => sum + (r.input_weight || 0) * (r.input_eps_yoy ?? 0),
          0
        ) / totalWeight
      : 0;

  const projectedEps = priorEps !== undefined ? priorEps * (1 + weightedGrowth) : null;

  return {
    totalWeight,
    activeWeight,
    coverage,
    weightedGrowth,
    projectedEps,
  };
};
