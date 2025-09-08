"""Convert real estate watch YAML to CSV for spreadsheet use."""
from pathlib import Path
import csv
import yaml


def yaml_to_csv(yaml_path: Path, csv_path: Path) -> None:
    with yaml_path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)

    rows = []
    for item in data.get("names", []):
        row = {
            "name": item.get("name", ""),
            "ticker": item.get("ticker", ""),
            "stance": item.get("stance", ""),
            "thesis": "; ".join(item.get("thesis", [])),
            "key_metrics_to_watch": "; ".join(item.get("key_metrics_to_watch", [])),
            "catalysts_near_term": "; ".join(item.get("catalysts", {}).get("near_term", [])),
            "catalysts_structural": "; ".join(item.get("catalysts", {}).get("structural", [])),
            "add_triggers": "; ".join(item.get("action_triggers", {}).get("add", [])),
            "trim_triggers": "; ".join(item.get("action_triggers", {}).get("trim", [])),
        }
        rows.append(row)

    fieldnames = [
        "name",
        "ticker",
        "stance",
        "thesis",
        "key_metrics_to_watch",
        "catalysts_near_term",
        "catalysts_structural",
        "add_triggers",
        "trim_triggers",
    ]

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    base = Path(__file__).resolve().parents[1] / "public" / "data"
    yaml_file = base / "real_estate_watch.yaml"
    csv_file = base / "real_estate_watch.csv"
    yaml_to_csv(yaml_file, csv_file)
    print(f"CSV saved to {csv_file}")
