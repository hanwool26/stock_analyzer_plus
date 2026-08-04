"""Stage 3: AI 기사 분류. methodology.html #stage3 참고.

25건씩 배치로 Claude에 보내 5개 카테고리(MACRO/POLICY/EVENT/TREND/SENTIMENT) 중 하나를
주 카테고리로, 보조 태그 배열과 company_specific 플래그를 부여받는다.
"""
from __future__ import annotations

from typing import Any

import ai_client
import config

_PROMPT_TEMPLATE = """다음은 뉴스 기사 목록입니다. 각 기사를 아래 5개 카테고리 중 하나로 분류하세요.

카테고리:
- MACRO: 거시경제 (금리, 환율, 물가, 수급, 유가)
- POLICY: 정부 정책 (세제, 규제, 산업 지원, 통상)
- EVENT: 특별 이슈 (감염병, 전쟁, 기술 돌파구, 사고)
- TREND: 구조적 트렌드 (고령화, AI 전환, 탄소중립)
- SENTIMENT: 심리/수급 (쏠림, 과열, 공포탐욕)

규칙:
- 각 기사에 주 카테고리(category) 1개와 보조 태그(sub_tags) 배열을 부여하세요.
- 순수 개별 기업 이벤트(다른 종목/산업에 파급력이 낮은 경우)는 company_specific: true 로 표기하세요.
- 반드시 아래와 같은 JSON 배열 형식으로만 출력하세요. 설명 텍스트를 절대 포함하지 마세요.

[{{"id": "<기사id>", "category": "MACRO", "sub_tags": ["..."], "company_specific": false}}]

기사 목록:
{articles}
"""


def _format_articles(batch: list[dict[str, Any]]) -> str:
    lines = []
    for a in batch:
        desc = (a.get("description") or "")[:200]
        lines.append(f'- id={a["id"]} | title="{a.get("title", "")}" | description="{desc}"')
    return "\n".join(lines)


def classify(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """articles 를 배치 처리하여 각 기사 dict에 category/sub_tags/company_specific 를 채워 넣는다.

    분류에 실패한(응답에 없는) 기사는 결과에서 제외한다.
    """
    by_id = {a["id"]: a for a in articles}
    batch_size = config.CLASSIFY_BATCH_SIZE
    classified: list[dict[str, Any]] = []

    for start in range(0, len(articles), batch_size):
        batch = articles[start : start + batch_size]
        prompt = _PROMPT_TEMPLATE.format(articles=_format_articles(batch))
        result = ai_client.call_claude_json(prompt)

        for entry in result:
            article = by_id.get(entry.get("id"))
            if not article:
                continue
            category = entry.get("category")
            if category not in config.NEWS_CATEGORIES:
                continue
            article["category"] = category
            article["sub_tags"] = entry.get("sub_tags", [])
            article["company_specific"] = bool(entry.get("company_specific", False))
            classified.append(article)

    return classified
