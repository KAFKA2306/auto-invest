import Init

/-!
A pure boolean abstraction of the live-fill broker-evidence gate in
`pipeline/policy.py`. The proof is about this policy abstraction.
It is not a proof of the Python interpreter, exchange feeds, or execution.
-/

namespace AuditPolicy

/-- For a live fill, require BOTH an observed broker source and a broker event ID.
    For every other event, this particular broker-evidence gate passes. -/
def allowsEvidenceGate (liveFill brokerSource hasBrokerId : Bool) : Bool :=
  !liveFill || (brokerSource && hasBrokerId)

theorem accepted_live_fill_has_evidence (source hasId : Bool)
    (h : allowsEvidenceGate true source hasId = true) :
    source = true ∧ hasId = true := by
  simpa [allowsEvidenceGate] using h

theorem live_fill_missing_source_is_rejected (hasId : Bool) :
    allowsEvidenceGate true false hasId = false := by
  simp [allowsEvidenceGate]

theorem live_fill_missing_id_is_rejected (source : Bool) :
    allowsEvidenceGate true source false = false := by
  simp [allowsEvidenceGate]

theorem backtest_never_requires_broker_evidence
    (source hasId : Bool) :
    allowsEvidenceGate false source hasId = true := by
  simp [allowsEvidenceGate]

end AuditPolicy
