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
    def test_backtest_simulated_fill_is_explicitly_allowed(self) -> None:
        self.assertEqual(validate_event(BASE), [])

    def test_live_fill_without_broker_evidence_is_rejected(self) -> None:
        event = {**BASE, "execution_environment": "live"}
        errors = validate_event(event)
        self.assertIn("live fill must come from broker_observation", errors)
        self.assertIn("live fill requires broker_event_id", errors)

    def test_live_broker_fill_with_external_id_is_allowed(self) -> None:
        event = {
            **BASE,
            "execution_environment": "live",
            "source_kind": "broker_observation",
            "broker_event_id": "broker-event-123",
        }
        self.assertEqual(validate_event(event), [])


if __name__ == "__main__":
    unittest.main()
