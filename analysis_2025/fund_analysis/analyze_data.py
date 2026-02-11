import pandas as pd
import matplotlib.pyplot as plt
import glob
import os
DATA_DIR = "data"
def analyze():
    files = glob.glob(f"{DATA_DIR}/*.csv")
    if not files:
        print("No data files found.")
        return
    dfs = {}
    for f in files:
        name = os.path.basename(f).replace(".csv", "")
        df = pd.read_csv(f, parse_dates=["Date"])
        df = df.set_index("Date")
        df = df.sort_index()
        df = df[~df.index.duplicated(keep="first")]
        dfs[name] = df["Price"]
    if not dfs:
        print("No data loaded.")
        return
    combined = pd.concat(dfs.values(), axis=1, keys=dfs.keys())
    combined = combined.dropna(how="all")
    combined = combined.dropna()
    if combined.empty:
        return
    normalized = combined / combined.iloc[0] * 100
    daily_returns = combined.pct_change().dropna()
    total_return = (combined.iloc[-1] / combined.iloc[0]) - 1
    days = (combined.index[-1] - combined.index[0]).days
    years = days / 365.25
    cagr = (1 + total_return) ** (1 / years) - 1
    volatility = daily_returns.std() * (252**0.5)
    sharpe = (cagr) / volatility
    rolling_max = combined.cummax()
    drawdown = (combined - rolling_max) / rolling_max
    max_drawdown = drawdown.min()
    print(
        f"Analysis Period: {combined.index[0].date()} to {combined.index[-1].date()} ({days} days)"
    )
    print("-" * 80)
    print(
        f"{'Asset':<20} | {'Return':<8} | {'CAGR':<8} | {'Vol':<8} | {'Sharpe':<8} | {'MaxDD':<8}"
    )
    print("-" * 80)
    for col in combined.columns:
        r = total_return[col]
        c = cagr[col]
        v = volatility[col]
        s = sharpe[col]
        m = max_drawdown[col]
        print(f"{col:<20} | {r:>7.2%} | {c:>7.2%} | {v:>7.2%} | {s:>7.2f} | {m:>7.2%}")
    fig, (ax1, ax2) = plt.subplots(
        2, 1, figsize=(12, 10), gridspec_kw={"height_ratios": [3, 1]}
    )
    for col in normalized.columns:
        is_fund = "BK311251" in col or "Fundnote" in col
        linewidth = 3.0 if is_fund else 1.5
        alpha = 1.0 if is_fund else 0.7
        ax1.plot(
            normalized.index,
            normalized[col],
            label=col,
            linewidth=linewidth,
            alpha=alpha,
        )
    ax1.set_title("Performance Comparison (Base=100)")
    ax1.set_ylabel("Normalized Value")
    ax1.legend()
    ax1.grid(True, linestyle="--", alpha=0.6)
    for col in drawdown.columns:
        is_fund = "BK311251" in col or "Fundnote" in col
        linewidth = 2.0 if is_fund else 1.0
        alpha = 1.0 if is_fund else 0.5
        ax2.plot(
            drawdown.index, drawdown[col], label=col, linewidth=linewidth, alpha=alpha
        )
    ax2.set_title("Drawdown")
    ax2.set_ylabel("Drawdown %")
    ax2.set_xlabel("Date")
    ax2.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    output_path = "output/fund_comparison_quant.png"
    plt.savefig(output_path)
    print(f"\nChart saved to {output_path}")
if __name__ == "__main__":
    analyze()
