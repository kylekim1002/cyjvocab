-- 음원 풀(WordAudio) — 프로덕션 DB에 테이블이 없을 때 1회 실행
-- Supabase → SQL Editor → New query → 아래 전체 실행 → Run
--
-- 오류: "The table public.WordAudio does not exist" → 이 스크립트로 해결

CREATE TABLE IF NOT EXISTS "WordAudio" (
    "id" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordAudio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WordAudio_normalizedKey_key" ON "WordAudio"("normalizedKey");
