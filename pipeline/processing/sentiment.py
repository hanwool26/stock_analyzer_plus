"""Stage S: 감성 분석. methodology.html #sentiment 참고.

Marketaux 엔티티 데이터에 이미 포함된 감성 점수를 활용한다 (별도 AI 호출 없음).
출력은 web/lib/types.ts 의 SentimentInfo 구조와 동일하게 맞춘다.

참고: methodology.html 은 "글로벌 관련주" 목록도 함께 산출하도록 명시하지만, 현재
web/lib/types.ts 의 Report 타입에는 이를 담을 필드가 없어 이번 구현 범위에서는 제외했다.
프론트에 노출하려면 types.ts에 필드를 추가하고 리포트 페이지도 함께 손봐야 한다.
"""
from __future__ import annotations

from typing import Any

import config


def compute_symbol_sentiment(marketaux_articles: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """심볼별로 (가중평균 감성 점수, 언급 횟수)를 계산한다."""
    scores: dict[str, list[float]] = {}
    for article in marketaux_articles:
        for entity in article.get("entities", []):
            symbol = entity.get("symbol")
            score = entity.get("sentiment_score")
            if not symbol or score is None:
                continue
            scores.setdefault(symbol, []).append(float(score))

    return {
        symbol: {"score": sum(vals) / len(vals), "mentions": len(vals)}
        for symbol, vals in scores.items()
    }


def apply_sentiment(ticker: str, sentiment_map: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    """추천 종목에 병합할 SentimentInfo 를 만든다. Marketaux 데이터가 없으면 None."""
    entry = sentiment_map.get(ticker)
    if entry is None:
        return None

    score = round(entry["score"], 2)
    return {
        "score": score,
        "riskFlag": score < config.SENTIMENT_RISK_THRESHOLD,
        "marketauxValidated": True,
    }
