-- 음원 풀(WordAudio)만 수동 추가할 때 사용 (빌드에서 prisma db push를 쓰지 않는 경우)
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS "WordAudio" (
    "id" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordAudio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WordAudio_normalizedKey_key" ON "WordAudio"("normalizedKey");
