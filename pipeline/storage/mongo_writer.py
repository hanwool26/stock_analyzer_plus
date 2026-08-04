"""Stage 7: 리포트 저장 & 배포. methodology.html #stage7 참고.

원본은 git push 로 정적 파일을 배포했지만, 이 구현은 MongoDB Atlas 의 `reports` 컬렉션에
직접 upsert 한다 — Vercel의 web/lib/reports.ts 가 같은 컬렉션을 읽으므로 재배포 없이 즉시 반영된다.
365일 보관 정책은 Postgres DELETE 대신 Mongo TTL 인덱스로 구현한다.
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
    return db["reports"]


def ensure_indexes(collection: Collection) -> None:
    collection.create_index([("date", ASCENDING), ("hour", ASCENDING)], unique=True, name="date_hour_unique")
    collection.create_index("expiresAt", expireAfterSeconds=0, name="ttl_expires_at")


def save_report(report: dict[str, Any]) -> None:
    """report(date, hour, marketContext, recommendations, categorySummaries)를 upsert한다."""
    collection = _get_collection()
    ensure_indexes(collection)

    now = datetime.now(timezone.utc)
    doc = {
        **report,
        "createdAt": now,
        "expiresAt": now + timedelta(days=_RETENTION_DAYS),
    }

    collection.update_one(
        {"date": report["date"], "hour": report["hour"]},
        {"$set": doc},
        upsert=True,
    )
