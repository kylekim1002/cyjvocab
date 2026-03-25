import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { supabase } from "@/lib/supabase"

/** Prisma P2021 또는 메시지로 테이블 미생성 감지 */
export function isStudentAppBackgroundTableMissingError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    const table = (e.meta as { table?: string } | undefined)?.table
    return !table || table.includes("StudentAppBackground")
  }
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes("StudentAppBackground") && msg.includes("does not exist")
}

export function studentAppBackgroundMissingTableResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "학생 배경용 DB 테이블이 아직 없습니다.",
      code: "MISSING_STUDENT_BG_TABLE" as const,
      hint:
        "Supabase 대시보드 → SQL → New query → 저장소의 scripts/add-student-app-background-table.sql 전체를 붙여 넣고 Run. (또는 로컬에서 프로덕션 DB에 연결된 채 npx prisma migrate deploy)",
    },
    { status: 503 }
  )
}

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
  try {
    const row = await prisma.studentAppBackground.findFirst({
      where: { isActive: true },
      select: { publicUrl: true },
    })
    return row?.publicUrl ?? null
  } catch (e: unknown) {
    if (isStudentAppBackgroundTableMissingError(e)) {
      console.warn("[StudentAppBackground] table missing; using default student background.")
      return null
    }
    throw e
  }
}
