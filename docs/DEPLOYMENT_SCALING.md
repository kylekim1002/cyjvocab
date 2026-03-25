# 배포·동시 접속(부하) 운영 체크리스트

코드 쪽 최적화는 `STUDENT_PERFORMANCE_APPLIED.md` 참고. 여기서는 **인프라·환경 변수** 위주입니다.

## 1. 데이터베이스 연결 (필수에 가깝게 권장)

| 항목 | 설명 |
|------|------|
| **Vercel `DATABASE_URL`** | Supabase **Transaction pooler**(보통 포트 **6543**) 사용. 직접 5432만 쓰면 서버리스 인스턴스마다 연결이 늘어 DB 한도에 걸리기 쉬움. |
| **쿼리 파라미터** | Prisma 권장: `?pgbouncer=true&connection_limit=1` (SSL이 필요하면 `&sslmode=require` 등 추가). **앱은 `lib/db-connection-url.ts`에서 풀러로 감지되면 자동 보강**하지만, Vercel 환경 변수에 명시해 두는 편이 가장 명확합니다. |
| **`DIRECT_URL`** | `prisma migrate` / `db push`용 **직접 연결(5432)**. 런타임 `DATABASE_URL`과 구분해 둠. |

`.env.example` 예시를 그대로 맞추면 됩니다.

## 2. 리전

| 항목 | 설명 |
|------|------|
| **`vercel.json`** | `"regions": ["icn1"]` 로 서울 리전 함수 실행(프로젝트 설정과 일치하는지 Vercel 대시보드에서 확인). |
| **Supabase** | DB 리전이 Vercel과 가까울수록 RTT 감소. |

## 3. 코드로 해결하기 어려운 것

| 항목 | 설명 |
|------|------|
| **전역 레이트 리밋** | IP 기억형 제한은 인스턴스마다 메모리가 달라 완벽하지 않음. 필요 시 **Redis / Vercel KV** 등 외부 저장소. |
| **콜드 스타트** | 트래픽이 드물면 첫 요청만 느릴 수 있음. Pro/상시 트래픽 등은 인프라 선택. |

## 4. 배포 후 확인

- Vercel **Functions** 로그에 DB connection pool exhausted 류 에러가 없는지
- Supabase **Database** 대시보드에서 연결 수·쿼리 지연

---

*변경 시 `STUDENT_PERFORMANCE_APPLIED.md` 또는 본 문서를 함께 갱신하면 됩니다.*
