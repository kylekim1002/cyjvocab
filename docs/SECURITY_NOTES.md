# 보안 관련 적용 사항 (요약)

- **민감 로그**: 프로덕션에서 토큰·답안 전체가 서버 로그에 남지 않도록 `lib/safe-log.ts`의 `devLog` 사용 및 `lib/auth.ts` 로그 정리.
- **자동로그인 API**: `POST /api/auth/auto-login`에 IP당 분당 요청 상한(`lib/rate-limit-ip.ts`). `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`이 있으면 Upstash로 **전역** 적용, 없으면 인스턴스 메모리(로컬·폴백). 정상 1회 링크 사용에는 영향 없음.
- **자동로그인 토큰**: DB에는 SHA-256(hex)만 저장(`autoLoginTokenHash`). 평문 토큰은 발급·재발급 API 응답에서만 전달.
- **응답 본문**: 자동로그인 성공 시 클라이언트가 이미 알고 있는 토큰을 JSON에 반복해 담지 않음(동작 동일).

추가로 강화하려면: 비밀번호 정책 강화, 자동로그인 토큰 단회 사용·짧은 만료 등.
