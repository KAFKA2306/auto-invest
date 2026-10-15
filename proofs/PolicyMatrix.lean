import Policy

def bit (value : Bool) : String := if value then "1" else "0"

def main : IO Unit := do
  for live in [false, true] do
    for source in [false, true] do
      for hasId in [false, true] do
        let permitted := AuditPolicy.allowsEvidenceGate live source hasId
        IO.println s!"{bit live},{bit source},{bit hasId},{bit permitted}"
