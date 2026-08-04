"""Stage 5: 종목 후보 도출. methodology.html #stage5 참고.

시가총액 상위 100종목 유니버스(universe.json) 내에서만 후보를 선택하도록 강제하고,
뉴스 → 테마 → 섹터 → 종목 근거 체인을 요구한다. 유니버스 밖 티커는 후처리로 걸러낸다.
"""
from __future__ import annotations

import json
from typing import Any

import ai_client

_PROMPT_TEMPLATE = """당신은 뉴스 흐름을 바탕으로 투자 관심 종목 후보를 도출하는 애널리스트입니다.

아래는 오늘 시장 뉴스에서 도출된 카테고리별 핵심 흐름입니다:
{summaries}

아래는 후보로 선택할 수 있는 유일한 종목 유니버스입니다 (이 목록 밖의 종목은 절대 선택하지 마세요):
{universe}

규칙:
- 반드시 위 유니버스에 존재하는 종목만 선택하세요.
- 뉴스 흐름을 테마별로 그룹핑하고, 각 테마에 속한 종목 후보를 나열하세요.
- 각 후보에는 근거 체인(chain: "뉴스 → 테마 → 섹터 → 종목" 형태의 1~2문장), 신뢰도(confidence: high/medium/low), 리스크 플래그(risk_flags 배열)를 포함하세요.
- 방향성을 단정하는 표현("오른다", "사라" 등)은 금지합니다 — "관심 후보"로만 서술하세요.
- 근거가 약하면 억지로 연결하지 말고 제외하세요.

반드시 아래 JSON 배열 형식으로만 출력하세요. 설명 텍스트를 절대 포함하지 마세요.

[
  {{
    "theme": "...",
    "category": "TREND",
    "persistence": "structural",
    "candidates": [
      {{"ticker": "005930", "name": "삼성전자", "chain": "...", "confidence": "high", "risk_flags": ["..."]}}
    ]
  }}
]
"""


def _format_summaries(category_summaries: list[dict[str, Any]]) -> str:
    lines = []
    for s in category_summaries:
        lines.append(f"[{s['category']}]")
        for b in s["bullets"]:
            lines.append(f"  - ({b['persistence']}) {b['text']}")
    return "\n".join(lines)


def _format_universe(universe: list[dict[str, Any]]) -> str:
    return "\n".join(
        f"- {u['ticker']} | {u['name']} | {u['market']} | {u['sector']} | themes={u.get('themes', [])}"
        for u in universe
    )


def derive_candidates(
    category_summaries: list[dict[str, Any]], universe: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    prompt = _PROMPT_TEMPLATE.format(
        summaries=_format_summaries(category_summaries),
        universe=_format_universe(universe),
    )
    theme_groups = ai_client.call_claude_json(prompt)

    valid_tickers = {u["ticker"] for u in universe}
    filtered_groups = []
    for group in theme_groups:
        candidates = [c for c in group.get("candidates", []) if c.get("ticker") in valid_tickers]
        if candidates:
            filtered_groups.append({**group, "candidates": candidates})

    return filtered_groups


def flatten_candidates(theme_groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """추천 선별(Stage 6) 입력용으로 종목별 후보를 평탄화한다."""
    flat: dict[str, dict[str, Any]] = {}
    for group in theme_groups:
        for c in group.get("candidates", []):
            ticker = c["ticker"]
            entry = {
                **c,
                "theme": group.get("theme"),
                "category": group.get("category"),
                "persistence": group.get("persistence"),
            }
            # 같은 종목이 여러 테마에 걸리면 신뢰도가 더 높은 항목을 유지
            existing = flat.get(ticker)
            if not existing or _confidence_rank(entry) > _confidence_rank(existing):
                flat[ticker] = entry
    return list(flat.values())


def _confidence_rank(entry: dict[str, Any]) -> int:
    return {"high": 2, "medium": 1, "low": 0}.get(entry.get("confidence"), 0)
