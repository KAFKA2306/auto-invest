import requests
from bs4 import BeautifulSoup


def get_dates(url, params):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    resp = requests.get(url, params=params, headers=headers)
    soup = BeautifulSoup(resp.content, "html.parser")
    table = soup.find("table")
    if not table:
        return []
    rows = table.find_all("tr")
    if len(rows) <= 1:
        return []

    dates = []
    for row in rows[1:]:
        cols = row.find_all("td")
        ids = []
        ths = row.find_all("th")
        if ths:
            ids.extend(ths)
        ids.extend(cols)

        if ids:
            dates.append(ids[0].text.strip())

    return dates


symbol = "BK311251"  # Fund
url = f"https://finance.yahoo.co.jp/quote/{symbol}/history"
# Note: 'from' and 'to' must optionally be set?
# Yahoo JP often defaults to recent if not set.
# Let's try explicitly setting them to encompass > 1 month.
params1 = {"from": "20240101", "to": "20241211", "timeFrame": "d", "page": 1}
params2 = {"from": "20240101", "to": "20241211", "timeFrame": "d", "page": 2}

dates1 = get_dates(url, params1)
dates2 = get_dates(url, params2)

print("Page 1 first date:", dates1[0] if dates1 else "None")
print("Page 2 first date:", dates2[0] if dates2 else "None")

if dates1 and dates2 and dates1[0] == dates2[0]:
    print("FAILURE: Page 1 and Page 2 are identical.")
else:
    print("SUCCESS: Page 2 is different.")
