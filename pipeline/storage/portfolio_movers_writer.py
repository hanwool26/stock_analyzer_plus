"""포트폴리오 등락률 TOP5 뉴스 리포트 저장. mongo_writer.py(Stage 7)와 동일한 패턴.

reports 컬렉션과 별개로 portfolio_movers_reports 컬렉션에 (market, date) 단위로 upsert한다.
web/lib/portfolio-movers-reports.ts 가 같은 컬렉션을 읽는다.

DB 용량이 제한적이므로 시장별로 최신 5일치만 보관한다. expiresAt(TTL 인덱스)은 만일을
대비한 백스톱일 뿐이고, 실제 보관 개수는 매 저장 후 _prune_old_dates 가 market 기준으로
최신 5개 날짜만 남기고 나머지를 즉시 delete_many 로 지워서 강제한다.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection

import config

log = logging.getLogger("pipeline.portfolio_movers_writer")

# 시장(market)별로 실제 보관할 날짜 수.
_KEEP_DATES = 5
# TTL 백스톱 — _prune_old_dates 가 정상 동작하는 한 이 값에 도달하기 전에 지워진다.
_RETENTION_DAYS = 30


def _get_collection() -> Collection:
    if not config.MONGODB_URI:
        raise RuntimeError("MONGODB_URI 가 설정되어 있지 않습니다.")
    client = MongoClient(config.MONGODB_URI)
    db = client[config.MONGODB_DB]
    return db["portfolio_movers_reports"]


def ensure_indexes(collection: Collection) -> None:
    collection.create_index([("market", ASCENDING), ("date", ASCENDING)], unique=True, name="market_date_unique")
    collection.create_index("expiresAt", expireAfterSeconds=0, name="ttl_expires_at")


def _prune_old_dates(collection: Collection, market: str, keep_dates: int = _KEEP_DATES) -> None:
    """해당 market에서 가장 최근 keep_dates개의 날짜만 남기고 그 이전 문서는 모두 삭제한다."""
    dates = sorted(collection.distinct("date", {"market": market}), reverse=True)
    stale_dates = dates[keep_dates:]
    if not stale_dates:
        return
    result = collection.delete_many({"market": market, "date": {"$in": stale_dates}})
    if result.deleted_count:
        log.info("오래된 포트폴리오 리포트 삭제: market=%s %d건 (날짜 %d개 정리)", market, result.deleted_count, len(stale_dates))


def save_report(report: dict[str, Any]) -> None:
    """report(market, date, generatedAt, gainers, losers)를 upsert한다."""
    collection = _get_collection()
    ensure_indexes(collection)

    now = datetime.now(timezone.utc)
    doc = {
        **report,
        "createdAt": now,
        "expiresAt": now + timedelta(days=_RETENTION_DAYS),
    }

    collection.update_one(
        {"market": report["market"], "date": report["date"]},
        {"$set": doc},
        upsert=True,
    )

    _prune_old_dates(collection, report["market"])
