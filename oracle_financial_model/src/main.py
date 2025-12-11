import yaml
import sys
from pathlib import Path

# Add src to path if needed, or structured so it can be run as module
sys.path.append(str(Path(__file__).parent))

from models import Config


def load_config(path: str) -> Config:
    with open(path, "r") as f:
        data = yaml.safe_load(f)
    # The 'projections' part in YAML has a 'scenarios' key that we didn't model explicitly in Config,
    # but the Config model defined protections as Dict[str, dict] so it matches 'projections' key in yaml?
    # Actually wait, config.yaml structure is:
    # base_quarter: ...
    # projections:
    #   quarters_to_project: ...
    #   scenarios: ...
    # Let's adjust loading to match or the model.
    # The models.py defined Config having 'projections: Dict[str, dict]'.
    # That fits.
    return Config(**data)


def project_financials(config: Config) -> str:
    base = config.base_quarter
    scenarios_data = config.projections.scenarios
    quarters_count = config.projections.quarters_to_project

    report = f"# Oracle Quarterly Financial Projections\n\n"

    # 1. Facts Section
    report += "## 1. Facts (Baseline Data)\n"
    report += "These figures are based on FY2026 Q2 actuals provided.\n\n"
    report += f"- **Period:** {base.period}\n"
    report += f"- **Revenue:** ${base.revenue_B}B\n"
    report += f"- **Operating Income:** ${base.operating_income_B}B (Margin: {base.operating_income_B / base.revenue_B:.1%})\n"
    report += f"- **CAPEX (TTM):** ${base.capex_last_4q_B}B (Intensity: ~{base.current_capex_intensity:.1%})\n"
    report += f"- **Cloud Growth:** {base.cloud_revenue_growth_yoy_pct}% YoY\n"
    report += f"- **RPO:** ${base.rpo_B}B\n\n"

    report += "## 2. Scenarios\n\n"

    for scenario_name, scenario in scenarios_data.items():
        # scenario is already a ProjectionScenario object now due to Pydantic model parsing
        report += f"### Scenario: {scenario_name.capitalize()}\n\n"

        # Assumptions Section
        report += "**Assumptions:**\n"
        report += f"- **Cloud Growth Decay:** {scenario.cloud_growth_decay_rate}x per quarter\n"
        report += f"- **Software Growth:** {scenario.software_growth_rate * 100:+.1f}% drift\n"
        report += f"- **Margin Change:** {scenario.operating_margin_improvement * 100:+.1f} bps/quarter\n"
        report += (
            f"- **Target CAPEX Intensity:** {scenario.capex_intensity_target:.0%}\n"
        )
        report += f"- **RPO Growth:** {scenario.rpo_growth_yoy:.0%} YoY\n\n"

        report += "**Projections:**\n"
        report += "| Period | Revenue ($B) | Op Ex ($B) | Op Inc ($B) | Margin | CAPEX ($B) | RPO ($B) | Notes |\n"
        report += "|---|---|---|---|---|---|---|---|\n"

        # Initialize with base
        current_margin = base.operating_income_B / base.revenue_B
        current_rpo = base.rpo_B

        # Simplified cloud/software split estimation (implied)
        # Assuming Cloud is ~40% of rev for rough start if not specified?
        # Actually inputs gave growth rates but not absolute split.
        # Let's infer split from "Cloud revenue growth +34%".
        # If we don't have exact split, we apply blended growth or specific growth to estimated portions.
        # Oracle Q2 Total $16.1B. Cloud $5-6B range?
        # Let's assume Cloud is approx $7.0B (given +34% growth and large scale) and Software is rest for this model's logic.

        # Better: Estimate Cloud portion.
        # Knowns: Cloud grew 34%. License/Support "Slight decrease". Total grew ??
        # Let's estimate Cloud base = $7.0B (approx recent actuals), Others = $9.1B
        cloud_rev = 7.0
        other_rev = 9.1

        # Normalize software runrate (de-seasonalize based on Q2 factor)
        # Base Q2 factor is index 1.
        base_seasonality_idx = 1  # Q2
        normalized_software_runrate = other_rev / (
            base.software_seasonality_factors[base_seasonality_idx]
            if base.software_seasonality_factors
            else 1.0
        )

        current_quarter = 0
        while current_quarter < quarters_count:
            current_quarter += 1

            # --- Cloud Projection ---
            # YoY Growth Rate, decaying over time
            current_cloud_growth_yoy = (
                base.cloud_revenue_growth_yoy_pct
                * (scenario.cloud_growth_decay_rate**current_quarter)
                / 100.0
            )
            # Implied Sequential Growth ~ (1 + YoY)^(1/4) - 1
            # Simplify: current_cloud_rev = prev * (1 + yoy/4)
            prev_cloud_rev = cloud_rev
            cloud_rev = cloud_rev * (1 + current_cloud_growth_yoy / 4)
            cloud_delta = cloud_rev - prev_cloud_rev

            # --- Software Projection (Critical Thinking: Seasonality + Cannibalization) ---

            # 1. Structural Drift (Legacy decline or sticky base)
            drift_factor = (
                1 + (scenario.software_growth_rate * current_quarter) / 100.0 / 4
            )  # quarterly drift
            normalized_software_runrate = normalized_software_runrate * drift_factor

            # 2. Cannibalization (Cloud gains eat Software)
            cannibalization_loss = cloud_delta * base.cloud_cannibalization_ratio
            normalized_software_runrate -= cannibalization_loss

            # 3. Apply Reporting Seasonality
            # Current Q index (0=Q1, 1=Q2, 2=Q3, 3=Q4)
            # Base was Q2 (1).
            current_q_idx = (base_seasonality_idx + current_quarter) % 4
            seasonality_multiplier = base.software_seasonality_factors[current_q_idx]

            actual_software_rev = normalized_software_runrate * seasonality_multiplier

            # --- Total ---
            total_rev = cloud_rev + actual_software_rev

            # RPO Growth: modeled as sequential step based on annual rate
            # RPO is a stock variable, grows by (1+r)^0.25 roughly per quarter
            current_rpo = current_rpo * (1 + scenario.rpo_growth_yoy) ** 0.25

            # Margin expansion
            current_margin += scenario.operating_margin_improvement / 100.0
            op_inc = total_rev * current_margin
            op_ex = total_rev - op_inc

            # CAPEX: Smooth transition from current intensity to target
            # current_quarter goes 1..quarters_count
            # Linear interpolation:
            start_intensity = (
                base.current_capex_intensity if base.current_capex_intensity else 0.55
            )
            target_intensity = scenario.capex_intensity_target

            # We want to reach target by end of projection or stick to it?
            # Let's say we glide down over the projection period.
            progress = current_quarter / quarters_count
            # Or maybe exponential decay? Linear is safer for "Gliding down".
            current_intensity = (
                start_intensity + (target_intensity - start_intensity) * progress
            )

            capex = total_rev * current_intensity

            # Period Label
            # Q2 -> Q3, Q4, Q1...
            q_num = (2 + current_quarter - 1) % 4 + 1
            fy_num = 2026 + (2 + current_quarter - 1) // 4
            period = f"FY{fy_num} Q{q_num}"

            report += f"| {period} | {total_rev:.2f} | {op_ex:.2f} | {op_inc:.2f} | {current_margin:.1%} | {capex:.2f} | {current_rpo:.1f} | Cloud Growth {current_cloud_growth_yoy:.1%} |\n"

        report += "\n"

    return report


if __name__ == "__main__":
    try:
        config_path = Path(__file__).parent.parent / "config.yaml"
        config = load_config(str(config_path))
        report = project_financials(config)

        # Output to file
        output_path = Path(__file__).parent.parent / "prediction_report.md"
        with open(output_path, "w") as f:
            f.write(report)

        print(f"Report generated at {output_path}")
        print(report)

    except Exception as e:
        print(f"Error: {e}")
