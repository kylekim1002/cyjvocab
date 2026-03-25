# 자동로그인 토큰 해시 마이그레이션

프로덕션 DB에 아직 `autoLoginToken`(평문) 컬럼만 있는 경우, **배포 전** Supabase SQL Editor에서 아래를 실행하세요.

1. `migrate-auto-login-token-to-hash.sql` 내용 실행  
   - 기존 평문 토큰을 SHA-256(hex)으로 채운 뒤 평문 컬럼을 제거합니다.
2. 이미 새 스키마만 있다면 이 단계는 생략합니다.

로컬에서는 `npx prisma db push`로 스키마를 맞출 수 있으나, **기존 평문 데이터 보존**이 필요하면 위 SQL을 사용하는 것이 안전합니다.
