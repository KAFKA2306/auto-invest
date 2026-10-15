"""Runtime-only audit-policy edge cases not covered by the Lean evidence proof.

The live-fill/backtest evidence matrix is now verified against the actual
Python function by the Lean workflow's bridge script.
"""
from __future__ import annotations

import unittest

from pipeline.policy import validate_event


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
    "broker_event_id": None,
    "observed_data_ref": "fixture",
    "commission_bps": 0.0,
    "spread_bps": 0.0,
    "slippage_bps": 0.0,
    "tax_bps": 0.0,
}


class AuditPolicyTest(unittest.TestCase):
    def test_missing_required_provenance_is_rejected(self) -> None:
        event = {**BASE, "observed_data_ref": ""}
        self.assertIn("observed_data_ref is required", validate_event(event))

    def test_negative_execution_costs_are_rejected(self) -> None:
        event = {**BASE, "slippage_bps": -0.1}
        self.assertIn("slippage_bps must be non-negative", validate_event(event))


if __name__ == "__main__":
    unittest.main()
