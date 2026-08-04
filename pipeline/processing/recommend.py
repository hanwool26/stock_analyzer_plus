"""Stage 6: 최종 추천 선별. methodology.html #stage6 참고.

유니버스 후보 중 국내 5 + 해외 5 = 10종목을 독립 순위로 선별하고,
기술적 분석(5b)·감성 분석(S) 결과를 병합해 최종 Recommendation 리스트를 만든다.
"""
from __future__ import annotations

from typing import Any

import ai_client
from processing import sentiment as sentiment_stage
from processing import technical as technical_stage

_PROMPT_TEMPLATE = """다음은 뉴스 기반으로 도출된 종목 후보 목록입니다 (테마, 근거 체인, 신뢰도 포함).
이 중에서 국내(KOSPI/KOSDAQ) 5종목 + 해외(NASDAQ/NYSE) 5종목, 총 10종목을 최종 추천으로 선별하세요.

후보 목록:
{candidates}

규칙:
- 국내 5개, 해외 5개를 반드시 선별하고, 각각 독립적으로 1~5위 순위를 매기세요.
- 한 테마에 쏠리지 않도록 섹터 분산을 고려하세요.
- 각 종목에 대해 종합 근거 요약(rationale, 1~3문장)과 리스크/주의사항(risk_flags 배열)을 작성하세요.
- 관심 기간(period)은 short(1~2주) 또는 medium(1~3개월) 중 하나, 신뢰도(confidence)는 high 또는 medium 중 하나로 표기하세요.
- "투자 권유가 아닌 관심 후보"라는 전제로 작성하세요 (매수/매도 단정 표현 금지).
- market_context 에 오늘 시장 전체 흐름 1~2문장을 함께 제공하세요.

반드시 아래 JSON 형식으로만 출력하세요. 설명 텍스트를 절대 포함하지 마세요.

{{
  "market_context": "...",
  "kr": [{{"ticker": "005930", "rank": 1, "rationale": "...", "risk_flags": ["..."], "period": "medium", "confidence": "high"}}],
  "us": [{{"ticker": "NVDA", "rank": 1, "rationale": "...", "risk_flags": ["..."], "period": "medium", "confidence": "high"}}]
}}
"""


def _format_candidates(flat_candidates: list[dict[str, Any]]) -> str:
    lines = []
    for c in flat_candidates:
        lines.append(
            f"- {c['ticker']} ({c['name']}) | theme={c.get('theme')} | chain=\"{c.get('chain', '')}\" "
            f"| confidence={c.get('confidence')} | risk_flags={c.get('risk_flags', [])}"
        )
    return "\n".join(lines)


def _region_for_market(market: str) -> str:
    return "KR" if market in ("KOSPI", "KOSDAQ") else "US"


def select_and_enrich(
    flat_candidates: list[dict[str, Any]],
    universe_by_ticker: dict[str, dict[str, Any]],
    marketaux_articles: list[dict[str, Any]],
) -> tuple[str, list[dict[str, Any]]]:
    """(market_context, recommendations) 를 반환한다. recommendations 는 web/lib/types.ts Recommendation[] 형태."""
    prompt = _PROMPT_TEMPLATE.format(candidates=_format_candidates(flat_candidates))
    selection = ai_client.call_claude_json(prompt)

    sentiment_map = sentiment_stage.compute_symbol_sentiment(marketaux_articles)
    candidates_by_ticker = {c["ticker"]: c for c in flat_candidates}

    recommendations: list[dict[str, Any]] = []
    for region_key in ("kr", "us"):
        for entry in selection.get(region_key, []):
            ticker = entry.get("ticker")
            meta = universe_by_ticker.get(ticker)
            if not meta:
                continue  # 유니버스 밖 티커는 무시 (안전장치)

            candidate = candidates_by_ticker.get(ticker, {})
            technical = technical_stage.get_technical_signal(ticker, meta["market"])
            if technical is None:
                continue  # 시세 데이터를 못 가져오면 리포트에서 제외

            rec = {
                "rank": entry.get("rank"),
                "region": _region_for_market(meta["market"]),
                "ticker": ticker,
                "name": meta["name"],
                "market": meta["market"],
                "sector": meta["sector"],
                "theme": candidate.get("theme", ""),
                "rationale": entry.get("rationale", ""),
                "riskFlags": entry.get("risk_flags", []),
                "period": entry.get("period") if entry.get("period") in ("short", "medium") else "medium",
                "confidence": entry.get("confidence") if entry.get("confidence") in ("high", "medium") else "medium",
                "technical": technical,
            }
            sentiment = sentiment_stage.apply_sentiment(ticker, sentiment_map)
            if sentiment:
                rec["sentiment"] = sentiment

            recommendations.append(rec)

    return selection.get("market_context", ""), recommendations
