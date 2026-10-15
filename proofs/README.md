# Lean 4 formal audit-policy proofs

This covers **one** critical guard in `pipeline/policy.py`: if an event
represents a live fill, it must carry both `broker_observation` as its
source and a nonempty broker event ID. A backtest fill does not need the
two live-broker fields. Lean proves the guard's safety conditions for all
boolean inputs. `scripts/check_lean_policy_bridge.py` enumerates all eight
input combinations in Lean and compares them against the actual Python
`validate_event` function.

Run from the repository root:

```sh
cd proofs && lake build && cd ..
python scripts/check_lean_policy_bridge.py
```

The boolean abstraction is intentionally narrow. Required fields, the set
of allowed stages/environments, numeric bps validation, JSON serialization,
Kafka/Spark/Iceberg behavior, and the correctness of external broker evidence
are **not** proven. Keep security and system integration tests and CI.
