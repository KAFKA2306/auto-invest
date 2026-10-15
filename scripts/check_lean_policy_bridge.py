"""Compare the Lean policy truth table to the real Python audit validator."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline.policy import validate_event  # noqa: E402

BASE = {
    "event_id": "evt",
    "run_id": "run",
    "event_seq": 1,
    "event_time": "2026-01-01T00:00:00Z",
    "stage": "fill",
    "strategy_version": "v1",
    "symbol": "TEST",
    "execution_environment": "backtest",
    "source_kind": "simulator",
    "observed_data_ref": "fixture",
}


def main() -> None:
    result = subprocess.run(
        ["lake", "env", "lean", "--run", "PolicyMatrix.lean"],
        cwd=ROOT / "proofs",
        check=True,
        capture_output=True,
        text=True,
    )
    rows = result.stdout.strip().splitlines()
    if len(rows) != 8:
        raise AssertionError(f"Expected eight Lean policy rows; got {rows!r}")
    observed = set()
    for row in rows:
        fields = row.split(",")
        if len(fields) != 4 or any(value not in {"0", "1"} for value in fields):
            raise AssertionError(f"Invalid Lean policy row: {row!r}")
        live, source, has_id, allowed = map(int, fields)
        key = (live, source, has_id)
        if key in observed:
            raise AssertionError(f"Duplicate Lean case: {key}")
        observed.add(key)
        event = {
            **BASE,
            "execution_environment": "live" if live else "backtest",
            "source_kind": "broker_observation" if source else "simulator",
            "broker_event_id": "external-id" if has_id else None,
        }
        python_allowed = not validate_event(event)
        if python_allowed != bool(allowed):
            raise AssertionError(f"Python/Lean divergence at {key}: Python={python_allowed} Lean={bool(allowed)}")
    print("PASS: all 8 live-fill broker-evidence combinations match Python production policy")


if __name__ == "__main__":
    main()
