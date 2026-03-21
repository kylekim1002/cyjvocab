# 학생 학습 성능 최적화 — 적용 내역

**목표:** 기능·동작은 유지하면서 **체감 속도**(클릭 반응, 페이지 진입, 저장 부담) 개선.

---

## 1. 클라이언트 (`components/student/learning-content.tsx`)

| 항목 | 내용 |
|------|------|
| 문항 정렬 | `module.items` 정렬을 `useMemo`로 1회만 수행 |
| 음원 재생 | `lib/student-learning/audio-pool.ts` — URL별 `Audio` 재사용, `playAudioFromPool` |
| 프리로드 | 현재·다음 문항 `audio_url`을 `preloadAudioUrls`로 선로드 |
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
| 번들 분할 | `next/dynamic`으로 `LearningContent` 지연 로딩 |
| 로딩 UI | `components/student/learning-page-loading.tsx` |

---

## 4. 공유 모듈 (`lib/student-learning/`)

- `audio-pool.ts`: 프리로드 / 풀 재생 API  
- `index.ts`: re-export  

---

## 5. 배포·운영

- Vercel 프로덕션 배포 시 위 변경이 포함되면 체감 개선이 반영됨.
- 재배포 전 로컬/원격 저장소에 커밋되어 있는지 확인 권장.

---

*이 문서는 적용된 최적화의 스냅샷이며, 이후 변경 시 본 파일 또는 `PROJECT_EVOLUTION_MATRIX.md`를 함께 갱신하면 됩니다.*
