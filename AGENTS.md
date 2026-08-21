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
5. Run focused deterministic/model tests and verify the exact reviewed revision before merge.
6. Stop at the fixed point; do not create another strategy, optimizer or signal without a specific unresolved decision and evidence test.

## Merge and release are separate

### PR merge conditions

A PR may merge when the repository-local portfolio/model contract is correct on the exact head revision: frozen inputs and assumptions are bound, deterministic/model tests pass, result artifacts are reproducible where affected, and no unresolved review or correctness blocker remains.

Fresh market data after merge, public deployment, user adoption, realized returns, brokerage integration, or live portfolio operation is **not** a merge condition unless the PR specifically changes the release mechanism and pre-merge validation belongs to that bounded change.

### Product/model release conditions

Release is a separate post-merge decision. Treat a portfolio-risk model/view as released only after the merged `main` revision is read back and the release surfaces in scope are actually verified, including intended input vintage, published model/artifacts/API/UI, deployment identity, and rollback/rebuild path where applicable.

A merged PR does not prove realized performance or production use. A release/data blocker may block release without invalidating a correctly merged repository change. Report merge and release independently.

## Boundaries

- Backtests, Kelly fractions, VaR and scenarios are model outputs, not guaranteed outcomes or orders.
- Do not infer missing returns, correlations, prices, constraints or transaction costs.
- Never execute trades, rebalance accounts, transfer funds, borrow, or change brokerage/account settings.
- Unobserved data, CI, deployment or realized performance remain unverified.

## Completion report

Report reproducible decision/risk capability Before -> After, canonical inputs/model result, Issue/PR/commit/check evidence, then report `merged` and `released` separately with direct evidence for each. Include duplicate/manual work removed and remaining blocker.