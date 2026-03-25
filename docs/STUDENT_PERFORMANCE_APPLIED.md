# 학생 학습 성능 최적화 — 적용 내역

**목표:** 기능·동작은 유지하면서 **체감 속도**(클릭 반응, 페이지 진입, 저장 부담) 개선.

---

## 1. 클라이언트 (`components/student/learning-content.tsx`)

| 항목 | 내용 |
|------|------|
| 문항 정렬 | `module.items` 정렬을 `useMemo`로 1회만 수행 |
| 음원 재생 | `lib/student-learning/audio-pool.ts` — URL별 `Audio` 재사용, `playAudioFromPool` |
| 프리로드 | 현재·다음 문항 `audio_url`을 `preloadAudioUrls`로 선로드 |
| 쓰기학습 | 단어·「음성」버튼 — `handlePlaySound()` + 풀/프리로드와 동일 경로 |
| 테스트 자동 저장 | 디바운스(~420ms) + `quizAnswersRef`로 연속 클릭 시 요청 수 감소 |
| 언마운트 flush | 페이지 이탈 시 대기 중인 테스트 저장 1회 전송(유실 방지) |
| 쓰기학습 | 정답 시 `setCurrentIndex` 우선, `updateProgress`는 비동기(낙관적) |
| 진행 API 호출 경로 | 핸들러에서 중복 `sort` 제거, 공통 `sortedItems` 사용 |

---

## 2. API (`app/api/student/progress/update/route.ts`)

| 항목 | 내용 |
|------|------|
| DB 조회 | `studentAssignmentProgress` **먼저** 조회 후, **진행 행이 없을 때만** `classAssignment` 존재 확인 → 업데이트 핫패스에서 쿼리 1회 절약 |

---

## 3. 학습 페이지 SSR (`app/student/learn/[assignmentId]/[moduleId]/page.tsx`)

| 항목 | 내용 |
|------|------|
| 세션 조회 | 단일 `findMany` 100건 혼합 스캔 제거 → `IN_PROGRESS` / `COMPLETED` 각각 최근 **30건**, 필요 필드만 `select` |
| phase 매칭 | `findSessionForPhase` 헬퍼로 중복 제거 |
| 학습 본문 로딩 | **`LearningContent` 정적 import** — `dynamic()` 청크 분리는 추가 네트워크 왕복으로 체감 지연될 수 있어 통합 |
| DB 왕복 | 학생·배정·모듈·진행·세션 후보 **6개 쿼리를 한 번의 `Promise.all`**로 실행 (이전: 3 + 3 두 번 왕복) |

---

## 3-1. 학생 홈 (`components/student/home-content.tsx`)

| 항목 | 내용 |
|------|------|
| 라우트 프리페치 | 날짜·탭 선택 후 보이는 `/student/learn/...` URL에 `router.prefetch` — 「시작」이 `router.push`만 쓸 때 사라진 **Link 프리페치**를 보완 |
| 호버 프리페치 | 「시작」 버튼 `onPointerEnter` 시 해당 학습 URL `prefetch` — 클릭 직전에 RSC/JS 선로드 유도 |

---

## 6. 학생 구간 “다른 화면” 로딩 (점수·설정·탭 전환)

| 항목 | 내용 |
|------|------|
| `app/student/loading.tsx` | 탭·URL 전환 시 **즉시 스켈레톤** — RSC 대기 중 빈 화면 완화 |
| `StudentRoutePrefetch` | 마운트 시 `/student`, `/student/stats`, `/student/settings` **프리페치** |
| 하단 네비 `Link` | `prefetch` 명시 |
| `stats/page.tsx` | 완료 세션 조회를 **`include` → `select`** + `take: 500` — 불필요한 `class` 등 제거 |
| `wrong/page.tsx` | 오답 목록 `take: 400` |

---

## 체감이 느려질 때 (원인·대응)

| 원인 | 설명 | 대응 |
|------|------|------|
| **WAIT 오버레이** | 시작·완료·나가기 시 **의도적으로** 전환 전까지 입력 차단 — “느려진” 것처럼 느껴질 수 있음 | 중복 클릭 방지 목적; 오버레이 없이 동작만 막는 방식으로 바꿀 수는 있음(디자인 선택) |
| **학습 페이지 dynamic import** (과거) | JS 청크를 **추가 요청**으로 받아 첫 진입이 길어질 수 있음 | ✅ **정적 import로 복구** |
| **시작 = push만** | Next `Link`의 **프리페치**가 없어져 클릭 후 로딩이 길어질 수 있음 | ✅ **`router.prefetch`로 목록 URL 선로드** |
| **Vercel·DB 리전** | 빌드/함수가 미국, DB가 멀면 RTT 증가 | Supabase·Vercel을 **같은 권역**(예: `vercel.json` `icn1` + DB 근처)에 맞추기 |
| **콜드 스타트** | 오랜만 접속 시 서버리스 웜업 | 첫 요청만 느림 — 상시 트래픽·Pro 플랜 등은 인프라 이슈 |

---

## 4. 공유 모듈 (`lib/student-learning/`)

- `audio-pool.ts`: 프리로드 / 풀 재생 API  
- `index.ts`: re-export  

---

## 5. 배포·운영

- Vercel 프로덕션 배포 시 위 변경이 포함되면 체감 개선이 반영됨.
- 재배포 전 로컬/원격 저장소에 커밋되어 있는지 확인 권장.

---

## 7. DB 연결(동시 접속·서버리스) — 코드 보강

| 항목 | 내용 |
|------|------|
| `lib/db-connection-url.ts` | `DATABASE_URL`이 Supabase **pooler**(6543 등)로 보이면 `pgbouncer=true`, `connection_limit=1` 이 없을 때만 자동 추가 |
| `lib/prisma.ts` | 위 헬퍼로 런타임 URL 정규화 후 `PrismaClient` 생성 |
| 문서 | `docs/DEPLOYMENT_SCALING.md` — Vercel·Supabase 환경 변수 체크리스트 |

---

*이 문서는 적용된 최적화의 스냅샷이며, 이후 변경 시 본 파일 또는 `PROJECT_EVOLUTION_MATRIX.md`를 함께 갱신하면 됩니다.*
