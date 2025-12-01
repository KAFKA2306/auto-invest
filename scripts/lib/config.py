from pathlib import Path
import yaml


def load_config() -> dict:
    with open(Path(__file__).parents[2] / "config.yaml") as f:
        return yaml.safe_load(f)
