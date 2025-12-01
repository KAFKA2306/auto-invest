import json
from pathlib import Path


def save_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def load_json(path: Path, default=None) -> dict:
    return json.loads(path.read_text()) if path.exists() else (default or {})
