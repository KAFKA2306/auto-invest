import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import os
import datetime
import re

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

TARGETS = {
    "Fundnote_Kaihou": "BK311251",
    "Nikkei225_Proxy": "998407.O",  # Yahoo JP Index Symbol
    "JPX400_ETF": "1591.T",
    "TSE_Growth250_ETF": "2516.T",
    "NASDAQ100_ETF": "1545.T",
}


def get_historical_data(symbol, days=365):
    """
    Fetches historical data from Yahoo Finance Japan.
    Logic tries to be generic for both Funds and Stocks/ETFs.
    """
    url = f"https://finance.yahoo.co.jp/quote/{symbol}/history"

    # For mutual funds (investment trusts), the URL might be different or the structure.
    # Yahoo JP usually redirects generic quote URLs to the specific type page.
    # But for history, let's check.
    # If it fails, we might need specific handling, but let's try generic first.

    print(f"Fetching {symbol} from {url}...")

    all_data = []
    page = 1
    # Yahoo Finance JP history pages usually define range via query params or just paginated.
    # For simplicity, we scrape page by page until we cover the date range.
    # Note: Yahoo JP History URL often looks like:
    # https://finance.yahoo.co.jp/quote/998407.O/history?from=20240101&to=20241231&timeFrame=d&page=1

    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days)

    str_start = start_date.strftime("%Y%m%d")
    str_end = end_date.strftime("%Y%m%d")

    current_to_date = end_date
    str_to = current_to_date.strftime("%Y%m%d")

    str_to = current_to_date.strftime("%Y%m%d")

    last_page_first_date = None

    # We will loop until we reach start_date
    while True:
        # Update params with current 'to' date
        # Note: 'from' can be fixed to start_date or just leave it.
        # If we move 'to' backwards, 'from' just needs to be <= 'to'.
        params = {"from": str_start, "to": str_to, "timeFrame": "d", "page": page}

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        try:
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            resp.raise_for_status()
        except requests.exceptions.HTTPError as e:
            print(f"Error fetching {symbol}: {e}")
            break

        soup = BeautifulSoup(resp.content, "html.parser")
        table = soup.find("table")

        if not table:
            print(f"No table found for {symbol} at {str_to}.")
            break

        rows = table.find_all("tr")
        if len(rows) <= 1:
            break

        # Debug: Save HTML to file to analyze pagination structure specifically for this symbol
        if page == 1:
            with open(f"{DATA_DIR}/debug_{symbol}.html", "w", encoding="utf-8") as f:
                f.write(soup.prettify())
            print(f"Saved debug HTML for {symbol}")

        # Parse logic remains similar...
        # We need to find the oldest date in this batch
        batch_dates = []

        # ... (headers detection etc) ...
        headers = [th.text.strip() for th in rows[0].find_all("th")]

        # Identify columns (reusing existing logic)
        try:
            date_idx = 0
            price_idx = -1
            for i, h in enumerate(headers):
                if "終値" in h or "基準価額" in h:
                    price_idx = i
                    break
            if price_idx == -1:
                if len(headers) >= 2:
                    price_idx = 1
                else:
                    break
        except:
            break

        data_found_in_batch = (
            False  # This variable is not used, `data_found_on_page` is used.
        )

        for row in rows[1:]:
            # Unify th and td logic
            cols = row.find_all("td")
            effective_cols = []
            ths = row.find_all("th")
            if ths:
                effective_cols.extend(ths)
            effective_cols.extend(cols)

            if len(effective_cols) <= price_idx:
                continue

            date_str = effective_cols[date_idx].text.strip()
            price_str = effective_cols[price_idx].text.strip()

            try:
                dt = datetime.datetime.strptime(date_str, "%Y年%m月%d日").date()
            except ValueError:
                try:
                    dt = datetime.datetime.strptime(date_str, "%Y/%m/%d").date()
                except:
                    continue

            if dt < start_date:
                # We reached our limit
                pass

            # Avoid duplicates? DataFrame will handle dedupe later, or we check existing
            # But simpler to just collect all.
            # Actually, calculate batch_min_date
            batch_dates.append(dt)

            all_data.append({"Date": dt, "Price": float(price_str.replace(",", ""))})
            data_found_on_page = True

        if not data_found_on_page:
            print(f"No data found on page {page}, stopping.")
            break

        # HYBRID PAGINATION LOGIC
        is_fund_type = "BK" in symbol

        if is_fund_type:
            # Logic for Funds: Ignore 'page', move 'to' date backwards
            if not batch_dates:
                print("No dates found in batch but data_found_on_page is True? Odd.")
                break

            min_date_in_batch = min(batch_dates)

            # Convert current str_to to date object
            curr_to_dt = datetime.datetime.strptime(str_to, "%Y%m%d").date()

            # If the minimum date we just got is >= current 'to' date (which means we didn't move back),
            # OR if we just want to ensure we fetch older data:
            # We set the NEXT 'to' date to be (min_date_in_batch - 1 day).

            next_to_dt = min_date_in_batch - datetime.timedelta(days=1)

            if next_to_dt < start_date:
                print(
                    f"Next request date {next_to_dt} is before start date {start_date}. Stopping."
                )
                break

            str_to = next_to_dt.strftime("%Y%m%d")
            print(f"Fund Strategy: Moving 'to' cursor to {str_to}")

            # 'page' param effectively unused, but keep it 1 to avoid confusion
            page = 1

            # Check for infinite loop (effective deadlock)
            # If new str_to is same as old (unlikely given -1 day logic)

        else:
            # Logic for Identical Page Detection (Indices)
            # Compare first date to detect if we are just getting page 1 over and over?
            # Actually, standard indices usually respect 'page'.
            # We keep the duplicate check for safety.

            first_row_date_str = None
            # Re-find first row to get identifier
            if len(rows) > 1:
                try:
                    # Reuse logic roughly
                    r0 = rows[1]
                    cs = r0.find_all("td")
                    eff = []
                    ths0 = r0.find_all("th")
                    if ths0:
                        eff.extend(ths0)
                    eff.extend(cs)
                    if len(eff) > date_idx:
                        first_row_date_str = eff[date_idx].text.strip()
                except:
                    pass

            if page > 1 and first_row_date_str == last_page_first_date:
                print(f"Page {page} returned same data as Page {page - 1}. Stopping.")
                break

            last_page_first_date = first_row_date_str
            page += 1
            print(f"Index Strategy: Requesting page {page}")

        time.sleep(1)

    if not all_data:
        print(f"No data gathered for {symbol}")
        return

    df = pd.DataFrame(all_data)
    df = df.sort_values("Date")
    # Filter data to be within the requested date range
    df = df[(df["Date"] >= start_date) & (df["Date"] <= end_date)]
    df.to_csv(f"{DATA_DIR}/{symbol}.csv", index=False)
    print(f"Saved {len(df)} records for {symbol}")


def main():
    for name, sym in TARGETS.items():
        get_historical_data(sym)


if __name__ == "__main__":
    main()
