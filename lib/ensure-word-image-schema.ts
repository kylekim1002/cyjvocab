import { prisma } from "@/lib/prisma"

let ensurePromise: Promise<void> | null = null

/**
 * 운영 DB에 WordImage 스키마가 케이스/컬럼명 불일치로 생성된 경우를 자동 보정합니다.
 * - wordimage(소문자) 테이블 -> "WordImage"로 변경
 * - normalizedkey/publicurl/storagepath/originalfilename -> Prisma가 기대하는 camelCase로 변경
 * - 누락 컬럼/인덱스 보완
 */
export async function ensureWordImageSchema(): Promise<void> {
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF to_regclass('public."WordImage"') IS NULL AND to_regclass('public.wordimage') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.wordimage RENAME TO "WordImage"';
  END IF;
END $$;
`)

    await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF to_regclass('public."WordImage"') IS NOT NULL THEN
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
  END IF;
END $$;
`)

    await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "WordImage" (
  "id" TEXT NOT NULL,
  "normalizedKey" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WordImage_pkey" PRIMARY KEY ("id")
)
`)

    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "normalizedKey" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "publicUrl" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "storagePath" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "originalFilename" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`)
    // 타입이 다르게 생성된 경우(예: uuid/text/timestamptz 혼재) Prisma가 실패하므로 강제 보정
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "id" TYPE TEXT USING "id"::text`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "normalizedKey" TYPE TEXT USING "normalizedKey"::text`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "publicUrl" TYPE TEXT USING "publicUrl"::text`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "storagePath" TYPE TEXT USING "storagePath"::text`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "originalFilename" TYPE TEXT USING "originalFilename"::text`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING CURRENT_TIMESTAMP`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) USING CURRENT_TIMESTAMP`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "id" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "normalizedKey" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "publicUrl" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "storagePath" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "originalFilename" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "WordImage" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "WordImage_normalizedKey_key" ON "WordImage"("normalizedKey")`)
  })().catch((err) => {
    ensurePromise = null
    throw err
  })

  return ensurePromise
}
