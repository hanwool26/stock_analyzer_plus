"""Stage 2: 전처리 & 필터링. methodology.html #stage2 참고.

4단계: 날짜 필터 → 중복 제거(URL해시+정규화제목) → 노이즈 제거(블랙리스트) → 크기 제한(최대 200, 국내/해외 비율 유지)
"""
from __future__ import annotations

import hashlib
import re
from datetime import date, datetime, timedelta
from email.utils import parsedate_to_datetime
from typing import Any

import config


def _parse_published_at(raw: str) -> datetime | None:
    if not raw:
        return None
    try:
        return parsedate_to_datetime(raw)  # Naver: RFC 2822
    except (TypeError, ValueError):
        pass
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))  # Marketaux: ISO 8601
    except ValueError:
        return None


def _normalize_title(title: str) -> str:
    return re.sub(r"\s+", "", re.sub(r"[^\w가-힣]", "", title or "")).lower()


def _assign_ids(articles: list[dict[str, Any]]) -> None:
    for a in articles:
        key = a.get("url") or a["title"]
        a["id"] = hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]


def filter_by_date(articles: list[dict[str, Any]], target_date: date) -> list[dict[str, Any]]:
    """대상일 및 전일 기사만 유지 (시차 허용)."""
    prev_date = target_date - timedelta(days=1)
    kept = []
    for a in articles:
        dt = _parse_published_at(a.get("published_at", ""))
        if dt is None:
            continue  # 날짜를 알 수 없는 기사는 제외
        if dt.date() in (target_date, prev_date):
            kept.append(a)
    return kept


def dedupe(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """URL 해시 + 정규화된 제목 기준 dedup."""
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    kept = []
    for a in articles:
        url_key = hashlib.sha1((a.get("url") or "").encode("utf-8")).hexdigest()
        title_key = _normalize_title(a.get("title", ""))
        if url_key in seen_urls or (title_key and title_key in seen_titles):
            continue
        seen_urls.add(url_key)
        if title_key:
            seen_titles.add(title_key)
        kept.append(a)
    return kept


def remove_noise(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """비경제 기사 필터링 (블랙리스트 키워드가 제목/설명에 포함되면 제거)."""
    def is_noise(a: dict[str, Any]) -> bool:
        text = f"{a.get('title', '')} {a.get('description', '')}"
        return any(kw in text for kw in config.NOISE_BLACKLIST)

    return [a for a in articles if not is_noise(a)]


def limit_size(articles: list[dict[str, Any]], max_articles: int) -> list[dict[str, Any]]:
    """최대 max_articles 건으로 제한하되 국내(naver)/해외(marketaux) 비율을 유지한다."""
    if len(articles) <= max_articles:
        return articles

    domestic = [a for a in articles if a.get("source") == "naver"]
    foreign = [a for a in articles if a.get("source") != "naver"]
    total = len(domestic) + len(foreign)
    if total == 0:
        return articles[:max_articles]

    foreign_quota = max(1, round(max_articles * len(foreign) / total)) if foreign else 0
    domestic_quota = max_articles - foreign_quota

    return domestic[:domestic_quota] + foreign[:foreign_quota]


def clean(articles: list[dict[str, Any]], target_date: date) -> list[dict[str, Any]]:
    step1 = filter_by_date(articles, target_date)
    step2 = dedupe(step1)
    step3 = remove_noise(step2)
    step4 = limit_size(step3, config.MAX_ARTICLES)
    _assign_ids(step4)
    return step4
