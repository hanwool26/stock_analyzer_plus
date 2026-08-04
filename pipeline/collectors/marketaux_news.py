"""Stage 1 (해외) + Stage S 원천 데이터: Marketaux 뉴스/엔티티 감성 수집. methodology.html #stage1, #sentiment 참고."""
from __future__ import annotations

import time
from typing import Any

import requests

import config

MARKETAUX_ENDPOINT = "https://api.marketaux.com/v1/news/all"


def _search_symbol_group(symbols: list[str]) -> list[dict[str, Any]]:
    params = {
        "symbols": ",".join(symbols),
        "filter_entities": "true",
        "language": "en",
        "limit": 10,
        "api_token": config.MARKETAUX_API_KEY,
    }
    resp = requests.get(MARKETAUX_ENDPOINT, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json().get("data", [])

    articles = []
    for item in data:
        entities = [
            {
                "symbol": e.get("symbol"),
                "name": e.get("name"),
                "sentiment_score": e.get("sentiment_score"),
            }
            for e in item.get("entities", [])
        ]
        articles.append(
            {
                "source": "marketaux",
                "title": item.get("title", ""),
                "description": item.get("description", "") or item.get("snippet", ""),
                "url": item.get("url", ""),
                "published_at": item.get("published_at", ""),
                "entities": entities,
            }
        )
    return articles


def collect() -> list[dict[str, Any]]:
    """섹터별 심볼 그룹으로 해외 뉴스 + 엔티티 감성 데이터를 수집한다 (~15건 목표)."""
    if not config.MARKETAUX_API_KEY:
        raise RuntimeError("MARKETAUX_API_KEY 가 설정되어 있지 않습니다.")

    all_articles: list[dict[str, Any]] = []
    groups = list(config.MARKETAUX_SYMBOL_GROUPS.values())

    for i, symbols in enumerate(groups):
        all_articles.extend(_search_symbol_group(symbols))
        if i < len(groups) - 1:
            time.sleep(config.MARKETAUX_RATE_LIMIT_SECONDS)

    return all_articles
