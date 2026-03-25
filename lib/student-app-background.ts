import { prisma } from "@/lib/prisma"
import { supabase } from "@/lib/supabase"

export const STUDENT_BG_BUCKET =
  process.env.SUPABASE_STUDENT_BACKGROUND_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STUDENT_BACKGROUND_BUCKET ||
  "student-backgrounds"

/** WebP만 허용 — 단일 포맷으로 MIME·렌더 일관성 유지 */
export const STUDENT_BG_MAX_BYTES = 5 * 1024 * 1024

const ALLOWED_MIME = new Set(["image/webp"])

let ensureBucketPromise: Promise<void> | null = null

export function isStudentBgMimeAllowed(mime: string): boolean {
  return ALLOWED_MIME.has(mime.toLowerCase())
}

export async function ensureStudentBackgroundBucket(): Promise<void> {
  if (!supabase) return
  if (ensureBucketPromise) return ensureBucketPromise

  ensureBucketPromise = (async () => {
    const { data: bucket } = await supabase.storage.getBucket(STUDENT_BG_BUCKET)
    if (!bucket) {
      const { error } = await supabase.storage.createBucket(STUDENT_BG_BUCKET, {
        public: true,
        fileSizeLimit: STUDENT_BG_MAX_BYTES,
        allowedMimeTypes: ["image/webp"],
      })
      if (error && !String(error.message).toLowerCase().includes("already exists")) {
        throw new Error(`학생 배경 버킷 생성 실패: ${error.message}`)
      }
    }
  })().catch((e) => {
    ensureBucketPromise = null
    throw e
  })

  return ensureBucketPromise
}

/** 활성 배경이 없으면 null → 학생 UI는 기본(bg-gray-50 등)만 사용 */
export async function getActiveStudentBackgroundUrl(): Promise<string | null> {
  const row = await prisma.studentAppBackground.findFirst({
    where: { isActive: true },
    select: { publicUrl: true },
  })
  return row?.publicUrl ?? null
}
