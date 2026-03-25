-- 자동로그인 토큰: 평문 컬럼 제거 → SHA-256(hex) 저장
-- Supabase SQL Editor에서 한 번 실행 후 `prisma db pull` 또는 스키마 동기화 권장.
-- Node의 hashAutoLoginToken과 동일: SHA256(UTF-8 문자열) → hex

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "autoLoginTokenHash" TEXT;

UPDATE "Student"
SET "autoLoginTokenHash" = encode(digest("autoLoginToken", 'sha256'), 'hex')
WHERE "autoLoginToken" IS NOT NULL
  AND trim("autoLoginToken") <> ''
  AND ("autoLoginTokenHash" IS NULL OR trim("autoLoginTokenHash") = '');

CREATE UNIQUE INDEX IF NOT EXISTS "Student_autoLoginTokenHash_key"
  ON "Student"("autoLoginTokenHash")
  WHERE "autoLoginTokenHash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Student_autoLoginTokenHash_idx" ON "Student"("autoLoginTokenHash");

DROP INDEX IF EXISTS "Student_autoLoginToken_key";
DROP INDEX IF EXISTS "Student_autoLoginToken_idx";

ALTER TABLE "Student" DROP COLUMN IF EXISTS "autoLoginToken";
