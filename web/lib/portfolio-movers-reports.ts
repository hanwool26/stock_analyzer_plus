import type { PortfolioMoversReport, Region } from "./types";
import { getPortfolioMoversCollection } from "./mongo";

// Mongo 문서 → PortfolioMoversReport 타입으로 변환 (_id, createdAt, expiresAt 등 저장용 메타 필드 제거)
function toReport(doc: Record<string, unknown>): PortfolioMoversReport {
  const { market, date, generatedAt, gainers, losers } = doc;
  return { market, date, generatedAt, gainers, losers } as unknown as PortfolioMoversReport;
}

/** 포트폴리오 탭에 표시할 시장별 최신 리포트. 없으면 null (mock 폴백 없음 — 아직 파이프라인이 안 돌았을 수 있음). */
export async function getLatestPortfolioMoversReport(market: Region): Promise<PortfolioMoversReport | null> {
  const collection = await getPortfolioMoversCollection();
  if (!collection) return null;

  const doc = await collection.find({ market }).sort({ date: -1 }).limit(1).next();
  return doc ? toReport(doc) : null;
}

/** Reports 탭 목록용 — 최신순, 시장 구분 없이 전체. */
export async function listPortfolioMoversReports(): Promise<PortfolioMoversReport[]> {
  const collection = await getPortfolioMoversCollection();
  if (!collection) return [];

  const docs = await collection.find({}).sort({ date: -1, market: 1 }).limit(100).toArray();
  return docs.map(toReport);
}

/** Reports 상세 페이지용 — 특정 시장/일자 리포트. */
export async function getPortfolioMoversReport(market: Region, date: string): Promise<PortfolioMoversReport | null> {
  const collection = await getPortfolioMoversCollection();
  if (!collection) return null;

  const doc = await collection.findOne({ market, date });
  return doc ? toReport(doc) : null;
}
