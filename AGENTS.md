# Repository Agent Contract

## Mission

Own portfolio-risk and sizing research for this repository. Produce reproducible portfolio risk, volatility and Kelly/sizing analyses from versioned inputs without turning research outputs into automatic trading or account actions.

## Canonical authority

- Consume market/fundamental observations from their owning canonical source/provider/repository where possible; avoid building duplicate collectors solely for portfolio calculations.
- Preserve asset identity, timestamp/as-of, unit/currency, return definition, data window and provenance required by each model/run.
- Keep observed inputs, deterministic statistics, model assumptions, scenarios and recommended/selected research parameters explicitly separate.

## Autonomous execution

1. Inspect current `main`, README, open Issues/PRs, canonical inputs/models, workflows/tests and public outputs.
2. Continue one canonical workline before adding another model, dataset, branch or Issue.
3. Prefer reproducible risk/sizing results, leakage/definition corrections, scenario correctness, user-visible decision support, then simplification.
4. Require frozen/versioned inputs and explicit assumptions before comparing or promoting model results.
5. Run focused deterministic/model tests and verify reviewed/merged/public state when applicable.
6. Stop at the fixed point; do not create another strategy, optimizer or signal without a specific unresolved decision and evidence test.

## Boundaries

- Backtests, Kelly fractions, VaR and scenarios are model outputs, not guaranteed outcomes or orders.
- Do not infer missing returns, correlations, prices, constraints or transaction costs.
- Never execute trades, rebalance accounts, transfer funds, borrow, or change brokerage/account settings.
- Unobserved data, CI, deployment or realized performance remain unverified.

## Completion report

Report reproducible decision/risk capability Before -> After, canonical inputs/model result, Issue/PR/commit/check/public evidence when applicable, duplicate/manual work removed, and remaining blocker.