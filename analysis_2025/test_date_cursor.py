import requests
from bs4 import BeautifulSoup
import datetime


def get_first_date(url, params):
    headers = {"User-Agent": "Mozilla/5.0"}
    print(f"Requesting {url} with {params}")
    resp = requests.get(url, params=params, headers=headers)
    soup = BeautifulSoup(resp.content, "html.parser")
    table = soup.find("table")
    if not table:
        return None
    rows = table.find_all("tr")
    if len(rows) <= 1:
        return None

    # Parse first row date
    row = rows[1]
    cols = row.find_all("td")
    eff = []
    ths = row.find_all("th")
    if ths:
        eff.extend(ths)
    eff.extend(cols)
    if not eff:
        return None

    return eff[0].text.strip()


symbol = "BK311251"
url = f"https://finance.yahoo.co.jp/quote/{symbol}/history"

# Request 1: Recent
params1 = {"from": "20240101", "to": "20251210", "timeFrame": "d", "page": 1}
d1 = get_first_date(url, params1)
print(f"Date with to=20251210: {d1}")

# Request 2: Older
params2 = {"from": "20240101", "to": "20251101", "timeFrame": "d", "page": 1}
d2 = get_first_date(url, params2)
print(f"Date with to=20251101: {d2}")

if d1 == d2:
    print("FAILURE: 'to' parameter ignored (Dates are identical).")
else:
    print("SUCCESS: 'to' parameter respected.")
