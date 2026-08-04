"""Stage 4: 카테고리별 요약. methodology.html #stage4 참고.

5개 카테고리 각각에 대해 Claude를 호출해 핵심 흐름을 3~5개 불릿(+지속성 태그)으로 요약한다.
출력은 web/lib/types.ts 의 CategorySummary 구조와 동일하게 맞춘다.
"""
from __future__ import annotations

from typing import Any

import ai_client
import config

_PROMPT_TEMPLATE = """다음은 "{category}" 카테고리로 분류된 뉴스 기사 목록입니다.
이 기사들에서 반복되거나 중요한 핵심 흐름을 3~5개의 불릿으로 요약하세요.

규칙:
- 각 흐름에 지속성 태그(persistence)를 부여하세요: shock(단기 충격, 1~2주 내 소멸 가능) / structural(구조적 트렌드, 장기 지속) / recurring(반복 이슈, 주기적으로 영향).
- 원문을 그대로 복사하지 말고 자체 표현으로 요약하세요.
- 반드시 아래 JSON 배열 형식으로만 출력하세요. 설명 텍스트를 절대 포함하지 마세요.

[{{"text": "...", "persistence": "structural"}}]

기사 목록:
{articles}
"""


def _format_articles(batch: list[dict[str, Any]]) -> str:
    lines = []
    for a in batch:
        desc = (a.get("description") or "")[:150]
        lines.append(f'- title="{a.get("title", "")}" | description="{desc}" | url={a.get("url", "")}')
    return "\n".join(lines)


def summarize(classified_articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """카테고리별 CategorySummary 리스트를 반환한다."""
    summaries: list[dict[str, Any]] = []

    for category in config.NEWS_CATEGORIES:
        articles = [a for a in classified_articles if a.get("category") == category]
        if not articles:
            continue

        sample = articles[: config.SUMMARY_ARTICLES_PER_CATEGORY]
        prompt = _PROMPT_TEMPLATE.format(category=category, articles=_format_articles(sample))
        bullets_raw = ai_client.call_claude_json(prompt)

        bullets = [
            {
                "text": b.get("text", ""),
                "persistence": b.get("persistence") if b.get("persistence") in config.PERSISTENCE_TAGS else "recurring",
            }
            for b in bullets_raw
            if b.get("text")
        ]
        if bullets:
            summaries.append({"category": category, "bullets": bullets})

    return summaries
