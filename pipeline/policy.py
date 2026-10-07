from __future__ import annotations

ALLOWED_STAGES = {"signal", "order", "fill", "position", "performance"}
ALLOWED_ENVIRONMENTS = {"backtest", "live"}


def validate_event(event: dict) -> list[str]:
    errors: list[str] = []
    required = (
        "event_id",
        "run_id",
        "event_seq",
        "event_time",
        "stage",
        "strategy_version",
        "symbol",
        "execution_environment",
        "source_kind",
        "observed_data_ref",
    )
    for field in required:
        if event.get(field) in (None, ""):
            errors.append(f"{field} is required")

    if event.get("stage") not in ALLOWED_STAGES:
        errors.append("stage is invalid")
    if event.get("execution_environment") not in ALLOWED_ENVIRONMENTS:
        errors.append("execution_environment is invalid")

    if event.get("stage") == "fill" and event.get("execution_environment") == "live":
        if event.get("source_kind") != "broker_observation":
            errors.append("live fill must come from broker_observation")
        if not event.get("broker_event_id"):
            errors.append("live fill requires broker_event_id")

    for field in ("commission_bps", "spread_bps", "slippage_bps", "tax_bps"):
        value = event.get(field)
        if value is not None and value < 0:
            errors.append(f"{field} must be non-negative")

    return errors
