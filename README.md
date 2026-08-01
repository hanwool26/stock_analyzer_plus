# Stock Analyzer Plus

뉴스 기반 AI 주식 분석 서비스 [Stock Analyzer](https://stock-analyzer-peach-chi.vercel.app/)를 참고해 만든 **PLUS 버전**입니다. 원본의 종목 추천 리포트 UI에 더해, 가족 단위 자산 관리 기능을 추가하는 것을 목표로 합니다.

> 분석 방법론 원본 문서: [`logic_strategy/methodology.html`](logic_strategy/methodology.html)

## 프로젝트 목표

- 원본 서비스와 동일한 뉴스 기반 종목 추천 리포트(국내 5 + 해외 5, 기술적 지표, 카테고리별 이슈)를 웹앱으로 재구현
- **+ 자산 탭**: 보유 주식 포트폴리오 등록 및 자산 추이 확인
- **+ 가계자산 탭**: 가족 구성원별 자산/부채/순자산 스냅샷 관리 및 순자산 추이 확인
- (예정) AI 코칭을 통한 포트폴리오 추천, 증권 API 연동 자동매매

## 현재 구현 상태 (Phase 0)

실제 뉴스 수집·AI 분석 파이프라인(Python, 별도 단계)은 아직 붙이지 않았고, `web/lib/mock-reports.ts`의 mock 리포트 데이터로 UI를 구성한 상태입니다. 아래 기능은 실제 동작합니다.

| 영역 | 내용 |
|---|---|
| **Home** (`/`) | 최신 리포트 요약, 국내 추천 TOP5, 카테고리별 이슈 |
| **Reports** (`/reports`) | 리포트 히스토리 목록 및 상세(국내 5 + 해외 5, RSI/MACD/볼린저밴드/거래량/이평선 추세) |
| **포트폴리오** (`/portfolio`) | 보유 종목 추가/거래 등록(매수 시 가중평균 단가 자동 계산)/삭제, 총 평가금액, 일별 자산 추이 차트 |
| **가계자산** (`/assets`) | 가족 구성원(기본: 이한울/양은진, 추가 가능) 별 자산·부채·순자산 스냅샷 관리, 날짜별 순자산 추이 그래프(그래프 클릭으로 해당 시점 상세 전환), Summary 탭에서 구성원 합산 현황 |

가계자산 데이터는 사용자가 실제 사용하던 엑셀 가계부(`reference_data/`)를 기반으로 2023-08 ~ 2026-07 구간의 히스토리를 시딩해두었습니다.

## 기술 스택

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4**
- **Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg`) + **Postgres**
- **Recharts** (자산/순자산 추이 차트)
- 서버 액션(Server Actions) 기반 CRUD, 별도 REST API 없음

## 디렉터리 구조

```
stock_analyzer_plus/
├── logic_strategy/methodology.html   # 원본 서비스 분석 방법론 문서
├── reference_data/                   # 가계자산 시딩에 사용한 원본 엑셀 파일들
└── web/                              # Next.js 앱 (실제 서비스 코드)
    ├── app/
    │   ├── page.tsx                  # Home
    │   ├── reports/                  # 리포트 목록/상세
    │   ├── portfolio/                # 주식 포트폴리오 (page + actions.ts)
    │   └── assets/                   # 가계자산 (page, [memberId], actions.ts)
    ├── components/                   # Nav, 각종 카드/폼/차트 컴포넌트
    ├── lib/                          # types, mock-reports, db(Prisma client), finance, date, format
    └── prisma/schema.prisma          # Holding/Transaction/PortfolioSnapshot, FamilyMember/FinanceSnapshot/FinanceItem
```

## 시작하기

Postgres DB가 필요합니다 (무료로 바로 만들려면 `npx create-db`, 자세한 내용은 아래 [배포하기](#배포하기-vercel) 참고).

```bash
cd web
cp .env.example .env      # DATABASE_URL 등 값 채우기
npm install                # postinstall로 prisma generate 자동 실행
npx prisma migrate dev     # 최초 1회: DB 스키마 마이그레이션
npm run dev
```

브라우저에서 `http://localhost:3000` 접속. 종료는 `Ctrl+C`.

- 빌드: `npm run build` (배포 시 `prisma migrate deploy`를 먼저 실행) / `npm run start`
- 린트: `npm run lint`
- `.env`에 `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`를 둘 다 채우면 앱 전체에 Basic Auth가 걸립니다 (`web/proxy.ts`). 로컬 개발 중엔 보통 비워둡니다.

## 배포하기 (Vercel)

모바일 등 어디서든 접속하려면 Vercel에 배포합니다. **SQLite는 서버리스 환경에서 데이터가 유지되지 않으므로 반드시 호스팅 Postgres를 사용해야 합니다** (이미 `web/lib/db.ts`가 `@prisma/adapter-pg` 기반으로 되어 있음).

1. **DB 준비**: `cd web && npx create-db` 로 무료 Prisma Postgres를 발급받거나, Vercel/Neon/Supabase 등에서 Postgres 인스턴스를 만들고 연결 문자열을 확보합니다.
2. **로컬에서 마이그레이션 생성**: 발급받은 연결 문자열을 `web/.env`의 `DATABASE_URL`에 넣고 `npx prisma migrate dev --name init`을 실행해 초기 마이그레이션을 만듭니다. 이 마이그레이션 파일들(`prisma/migrations/`)은 git에 커밋되어야 배포 시 `prisma migrate deploy`가 적용할 수 있습니다.
3. **GitHub에 push**.
4. **Vercel 프로젝트 생성**: [vercel.com](https://vercel.com)에서 GitHub 저장소를 Import합니다. 이 저장소는 모노레포 구조라 **Root Directory를 반드시 `web`으로 지정**해야 합니다 (그렇지 않으면 빌드가 실패합니다).
5. **환경변수 등록** (Vercel 프로젝트 → Settings → Environment Variables):
   - `DATABASE_URL` (필수)
   - `ANTHROPIC_API_KEY` (선택 — 앱 내 설정 다이얼로그에서 대신 등록해도 됨)
   - `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` (외부에 공개되는 URL이므로 강력 권장)
6. **Deploy**. 완료되면 `https://<project>.vercel.app` 주소로 PC/모바일 어디서나 접속할 수 있습니다.
7. 이후 `main` 브랜치에 push할 때마다 Vercel이 자동으로 `prisma migrate deploy && next build`를 실행하며 재배포합니다.

## 로드맵

| Phase | 내용 |
|---|---|
| 0 (완료) | Mock 리포트 UI, 포트폴리오 탭, 가계자산 탭 |
| 1 | 실제 뉴스 수집·분류·요약·기술적분석·추천 파이프라인 구현 (Python) |
| 2 | AI 코칭 — 보유 포트폴리오와 추천 리포트를 비교해 리밸런싱/신규 편입 제안 |
| 3 | 증권 API 연동 — 시세 조회 및 자동매매 |

## 참고 문서

- [`logic_strategy/methodology.html`](logic_strategy/methodology.html) — 원본 서비스의 7+1단계 분석 파이프라인, 파라미터, Claude 호출 예산 등
