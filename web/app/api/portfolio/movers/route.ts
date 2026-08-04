import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchKrQuoteDetailed, fetchUsQuoteDetailed } from "@/lib/quotes";

export const dynamic = "force-dynamic";

// 라즈베리파이 파이프라인(pipeline/portfolio_client.py)이 보유종목 + 당일 등락률을 가져오기 위해
// 호출하는 전용 엔드포인트. 이 프로젝트에서 유일한 API Route Handler — 외부 프로세스가
// 서버 액션을 직접 호출할 수 없어 별도 인증 라우트가 필요하다.
function isAuthorized(request: NextRequest): boolean {
  const token = process.env.PIPELINE_API_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return provided === token;
}

export async function GET(request: NextRequest) {
  if (!process.env.PIPELINE_API_TOKEN) {
    return NextResponse.json({ error: "PIPELINE_API_TOKEN이 서버에 설정되어 있지 않습니다." }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const market = request.nextUrl.searchParams.get("market");
  if (market !== "KR" && market !== "US") {
    return NextResponse.json({ error: 'market 쿼리 파라미터는 "KR" 또는 "US"여야 합니다.' }, { status: 400 });
  }

  const holdings = await prisma.holding.findMany({ where: { region: market } });
  const quotes = await Promise.allSettled(
    holdings.map((h) => (market === "KR" ? fetchKrQuoteDetailed(h.ticker) : fetchUsQuoteDetailed(h.ticker)))
  );

  const result = holdings
    .map((h, i) => {
      const q = quotes[i];
      const detail = q.status === "fulfilled" ? q.value : null;
      if (!detail) return null;
      return {
        ticker: h.ticker,
        name: h.name,
        price: detail.price,
        changePct: detail.changePct,
        currency: h.currency,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return NextResponse.json({
    market,
    generatedAt: new Date().toISOString(),
    holdings: result,
  });
}
