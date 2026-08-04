"""포트폴리오 등락률 TOP5 뉴스 리포트 저장. mongo_writer.py(Stage 7)와 동일한 패턴.

reports 컬렉션과 별개로 portfolio_movers_reports 컬렉션에 (market, date) 단위로 upsert한다.
web/lib/portfolio-movers-reports.ts 가 같은 컬렉션을 읽는다.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection

import config

_RETENTION_DAYS = 365


def _get_collection() -> Collection:
    if not config.MONGODB_URI:
        raise RuntimeError("MONGODB_URI 가 설정되어 있지 않습니다.")
    client = MongoClient(config.MONGODB_URI)
    db = client[config.MONGODB_DB]
    return db["portfolio_movers_reports"]


def ensure_indexes(collection: Collection) -> None:
    collection.create_index([("market", ASCENDING), ("date", ASCENDING)], unique=True, name="market_date_unique")
    collection.create_index("expiresAt", expireAfterSeconds=0, name="ttl_expires_at")


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
