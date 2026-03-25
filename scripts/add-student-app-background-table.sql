-- 학생 전역 배경(StudentAppBackground) — Supabase SQL Editor에서 수동 1회 실행용 (migrate deploy 대체 시)
-- 이미 Prisma migrate로 적용했다면 실행 불필요.

CREATE TABLE IF NOT EXISTS "StudentAppBackground" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAppBackground_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentAppBackground_isActive_idx" ON "StudentAppBackground"("isActive");
CREATE INDEX IF NOT EXISTS "StudentAppBackground_createdAt_idx" ON "StudentAppBackground"("createdAt");
