"""web/ 앱의 GET /api/portfolio/movers 를 호출해 보유종목 + 당일 등락률을 가져온다.

보유종목(Postgres/Prisma)은 web/ 앱에만 있어, run_portfolio_movers.py가 직접 DB에
접근하지 않고 web/app/api/portfolio/movers/route.ts 를 통해 조회한다.
"""
from __future__ import annotations

from typing import Any

import requests

import config


def fetch_holdings(market: str) -> list[dict[str, Any]]:
    """market("KR"|"US") 보유종목의 {ticker, name, price, changePct, currency} 목록을 가져온다."""
    if not config.PORTFOLIO_API_URL:
        raise RuntimeError("PORTFOLIO_API_URL 이 설정되어 있지 않습니다.")
    if not config.PIPELINE_API_TOKEN:
        raise RuntimeError("PIPELINE_API_TOKEN 이 설정되어 있지 않습니다.")

    url = f"{config.PORTFOLIO_API_URL.rstrip('/')}/api/portfolio/movers"
    resp = requests.get(
        url,
        params={"market": market},
        headers={"Authorization": f"Bearer {config.PIPELINE_API_TOKEN}"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("holdings", [])
