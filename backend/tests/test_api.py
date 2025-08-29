from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_market_and_analysis():
    response = client.get("/api/v1/market", params={"symbol": "TEST"})
    assert response.status_code == 200
    market_data = response.json()
    assert isinstance(market_data, list)
    assert market_data[0]["symbol"] == "TEST"

    analysis_response = client.post("/api/v1/analysis", json=market_data)
    assert analysis_response.status_code == 200
    metrics = analysis_response.json()
    assert set(metrics.keys()) == {
        "sharpe_ratio",
        "max_drawdown",
        "win_rate",
        "profit_factor",
    }
