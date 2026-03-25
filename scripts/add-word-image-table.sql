-- 이미지 풀(WordImage) 스키마 보정 스크립트 (Supabase SQL Editor에서 1회 실행)
-- 케이스/컬럼명이 다른 상태(wordimage, normalizedkey 등)도 자동 보정합니다.

DO $$
BEGIN
  IF to_regclass('public."WordImage"') IS NULL AND to_regclass('public.wordimage') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.wordimage RENAME TO "WordImage"';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WordImage" (
  "id" TEXT NOT NULL,
  "normalizedKey" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WordImage_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WordImage' AND column_name='normalizedkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WordImage' AND column_name='normalizedKey'
  ) THEN
    EXECUTE 'ALTER TABLE "WordImage" RENAME COLUMN "normalizedkey" TO "normalizedKey"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WordImage' AND column_name='publicurl'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WordImage' AND column_name='publicUrl'
  ) THEN
    EXECUTE 'ALTER TABLE "WordImage" RENAME COLUMN "publicurl" TO "publicUrl"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WordImage' AND column_name='storagepath'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WordImage' AND column_name='storagePath'
  ) THEN
    EXECUTE 'ALTER TABLE "WordImage" RENAME COLUMN "storagepath" TO "storagePath"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WordImage' AND column_name='originalfilename'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WordImage' AND column_name='originalFilename'
  ) THEN
    EXECUTE 'ALTER TABLE "WordImage" RENAME COLUMN "originalfilename" TO "originalFilename"';
  END IF;
END $$;

ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "normalizedKey" TEXT;
ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "publicUrl" TEXT;
ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "storagePath" TEXT;
ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "originalFilename" TEXT;
ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 타입/제약 정리
DO $$
BEGIN
  -- id가 identity(int/bigint)면 먼저 identity 속성을 해제해야 TEXT로 변경 가능합니다.
  BEGIN
    ALTER TABLE "WordImage" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;
ALTER TABLE "WordImage" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "WordImage" ALTER COLUMN "normalizedKey" TYPE TEXT USING "normalizedKey"::text;
ALTER TABLE "WordImage" ALTER COLUMN "publicUrl" TYPE TEXT USING "publicUrl"::text;
ALTER TABLE "WordImage" ALTER COLUMN "storagePath" TYPE TEXT USING "storagePath"::text;
ALTER TABLE "WordImage" ALTER COLUMN "originalFilename" TYPE TEXT USING "originalFilename"::text;
ALTER TABLE "WordImage" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING COALESCE("createdAt", CURRENT_TIMESTAMP);
ALTER TABLE "WordImage" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) USING COALESCE("updatedAt", CURRENT_TIMESTAMP);

UPDATE "WordImage" SET "id" = COALESCE("id", md5(random()::text || clock_timestamp()::text));
UPDATE "WordImage" SET "normalizedKey" = COALESCE("normalizedKey", '');
UPDATE "WordImage" SET "publicUrl" = COALESCE("publicUrl", '');
UPDATE "WordImage" SET "storagePath" = COALESCE("storagePath", '');
UPDATE "WordImage" SET "originalFilename" = COALESCE("originalFilename", '');
UPDATE "WordImage" SET "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP);
UPDATE "WordImage" SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);

ALTER TABLE "WordImage" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "WordImage" ALTER COLUMN "normalizedKey" SET NOT NULL;
ALTER TABLE "WordImage" ALTER COLUMN "publicUrl" SET NOT NULL;
ALTER TABLE "WordImage" ALTER COLUMN "storagePath" SET NOT NULL;
ALTER TABLE "WordImage" ALTER COLUMN "originalFilename" SET NOT NULL;
ALTER TABLE "WordImage" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "WordImage" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "WordImage" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WordImage" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WordImage_pkey'
      AND conrelid = 'public."WordImage"'::regclass
  ) THEN
    ALTER TABLE "WordImage" ADD CONSTRAINT "WordImage_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "WordImage_normalizedKey_key" ON "WordImage"("normalizedKey");
