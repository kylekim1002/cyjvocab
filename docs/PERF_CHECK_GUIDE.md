# Performance Check Guide (Vercel Pro + Supabase Pro)

## 1) Prerequisites

- Install k6
  - macOS: `brew install k6`
- Pick 10~50 real student test accounts (same campus level mix)
- Pick one valid `assignmentId`, `moduleId` pair for progress update checks

## 2) Baseline quick check (already available)

- Public page latency:
  - `curl -o /dev/null -s -w "ttfb=%{time_starttransfer}s total=%{time_total}s code=%{http_code}\n" https://cyjvocab.vercel.app/login`

## 3) Student scenario load test

Run:

```bash
BASE_URL="https://cyjvocab.vercel.app" \
STUDENT_CREDENTIALS="학생1:1234,학생2:5678,학생3:9012" \
ASSIGNMENT_ID="실제_assignment_id" \
MODULE_ID="실제_module_id" \
npm run perf:k6:student
```

Notes:

- `ASSIGNMENT_ID`, `MODULE_ID`를 빼면 로그인/세션/학생화면까지만 테스트합니다.
- 기본 시나리오: 100 -> 200 -> 400 VU 램프업 후 종료

## 4) Pass/Fail criteria (recommended)

- k6 thresholds:
  - `http_req_failed < 3%`
  - `p95 < 1200ms`, `p99 < 2500ms`
- Vercel Observability:
  - Function duration p95/p99 급상승 여부
  - 5xx 증가 여부
- Supabase:
  - DB CPU, active connections
  - slow query 상위 API 확인

## 5) What to watch for overload

- 로그인은 빠른데 학생 목록/학습 목록만 느린 경우:
  - 대량 목록 쿼리/렌더링 병목 가능성 큼
- 특정 시간대 급격한 p99 상승:
  - cold start + DB 연결 대기 + 무거운 API 동시 발생 가능성

## 6) Immediate optimization order if needed

1. 목록 API page size 제한 (pagination)
2. 목록 컬럼 최소화/select 경량화
3. 학생/학습 목록에 cursor pagination + 점진 로딩
4. 빈번 API(진행률 업데이트) debounce/배치 강화
