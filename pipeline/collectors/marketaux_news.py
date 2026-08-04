"""Stage 1 (해외) + Stage S 원천 데이터: Marketaux 뉴스/엔티티 감성 수집. methodology.html #stage1, #sentiment 참고."""
from __future__ import annotations

import logging
import time
from typing import Any

import requests

import config

log = logging.getLogger("pipeline")

MARKETAUX_ENDPOINT = "https://api.marketaux.com/v1/news/all"
# (connect, read) — 라즈베리파이 환경의 순간적인 지연을 감안해 read timeout을 넉넉히 잡는다.
_REQUEST_TIMEOUT = (5, 20)
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _fetch(symbols: list[str]) -> dict[str, Any]:
    """API 호출. read timeout / connection error / 429·5xx 는 지수 백오프로 재시도한다."""
    params = {
        "symbols": ",".join(symbols),
        "filter_entities": "true",
        "language": "en",
        "limit": 10,
        "api_token": config.MARKETAUX_API_KEY,
    }

    max_retries = config.MARKETAUX_MAX_RETRIES
    for attempt in range(max_retries + 1):
        try:
            resp = requests.get(MARKETAUX_ENDPOINT, params=params, timeout=_REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status not in _RETRYABLE_STATUS or attempt == max_retries:
                raise
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as exc:
            if attempt == max_retries:
                raise

        wait = config.MARKETAUX_RETRY_BACKOFF_SECONDS * (attempt + 1)
        log.warning(
            "marketaux 요청 실패 (%s, 시도 %d/%d) — %.0f초 후 재시도",
            symbols, attempt + 1, max_retries + 1, wait,
        )
        time.sleep(wait)


def _search_symbol_group(symbols: list[str]) -> list[dict[str, Any]]:
    data = _fetch(symbols).get("data", [])

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
    """섹터별 심볼 그룹으로 해외 뉴스 + 엔티티 감성 데이터를 수집한다 (~15건 목표).

    그룹 하나가 재시도 후에도 실패하면 해당 그룹만 건너뛰고 나머지 그룹은 계속 수집한다
    (marketaux 일시 장애로 전체 파이프라인이 중단되는 것을 방지).
    """
    if not config.MARKETAUX_API_KEY:
        raise RuntimeError("MARKETAUX_API_KEY 가 설정되어 있지 않습니다.")

    all_articles: list[dict[str, Any]] = []
    groups = list(config.MARKETAUX_SYMBOL_GROUPS.items())

    for i, (label, symbols) in enumerate(groups):
        try:
            all_articles.extend(_search_symbol_group(symbols))
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, requests.exceptions.HTTPError) as exc:
            log.error("marketaux 그룹 '%s' 수집 실패 — 건너뜁니다: %s", label, exc)
        if i < len(groups) - 1:
            time.sleep(config.MARKETAUX_RATE_LIMIT_SECONDS)

    return all_articles
