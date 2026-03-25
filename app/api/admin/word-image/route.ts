import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Prisma } from "@prisma/client"
import {
  normalizedKeyFromFilename,
  wordImageTableMissingMessage,
  safeImageExtension,
  contentTypeForImageExt,
} from "@/lib/word-image"

const IMAGE_BUCKET =
  process.env.SUPABASE_IMAGE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ||
  "word-images"

let ensureImageBucketPromise: Promise<void> | null = null

async function ensureImageBucket() {
  if (!supabase) return
  if (ensureImageBucketPromise) return ensureImageBucketPromise

  ensureImageBucketPromise = (async () => {
    const { data: bucket } = await supabase.storage.getBucket(IMAGE_BUCKET)
    if (!bucket) {
      const { error } = await supabase.storage.createBucket(IMAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/heic",
          "image/heif",
          "image/avif",
          "image/bmp",
        ],
      })
      if (error && !String(error.message).toLowerCase().includes("already exists")) {
        throw new Error(`이미지 버킷 생성 실패: ${error.message}`)
      }
    }
  })().catch((e) => {
    ensureImageBucketPromise = null
    throw e
  })

  return ensureImageBucketPromise
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureImageBucket()
    const rows = await prisma.wordImage.findMany({
      orderBy: { normalizedKey: "asc" },
    })
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error("word-image GET:", e)
    const msg = e.message || "목록을 불러오지 못했습니다."
    return NextResponse.json(
      { error: wordImageTableMissingMessage(msg) },
      { status: 500 }
    )
  }
}

const MAX_SIZE = 20 * 1024 * 1024

function extFromImageMime(mime: string): string | null {
  const m = mime.toLowerCase()
  if (m === "image/jpeg" || m === "image/jpg") return "jpg"
  if (m === "image/png") return "png"
  if (m === "image/webp") return "webp"
  if (m === "image/gif") return "gif"
  if (m === "image/heic") return "heic"
  if (m === "image/heif") return "heif"
  if (m === "image/avif") return "avif"
  if (m === "image/bmp") return "bmp"
  return null
}

/** multipart: files[] — 파일명이 단어 키 (예: apple.png). 동일 키는 덮어씁니다. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      {
        error: "Supabase Storage가 설정되지 않았습니다.",
        details: "NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.",
      },
      { status: 500 }
    )
  }

  try {
    await ensureImageBucket()
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files.length) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    const results: Array<{
      filename: string
      normalizedKey: string
      ok: boolean
      error?: string
      publicUrl?: string
    }> = []

    for (const file of files) {
      if (!file || !file.size) {
        results.push({ filename: file?.name || "?", normalizedKey: "", ok: false, error: "빈 파일" })
        continue
      }

      if (file.size > MAX_SIZE) {
        results.push({
          filename: file.name,
          normalizedKey: "",
          ok: false,
          error: "20MB 초과",
        })
        continue
      }

      let ext = safeImageExtension(file.name)
      if (!ext && file.type?.startsWith("image/")) {
        ext = extFromImageMime(file.type)
      }
      if (!ext) {
        results.push({
          filename: file.name,
          normalizedKey: "",
          ok: false,
          error: "지원 형식이 아닙니다. (jpg, png, webp, gif, heic, heif, avif, bmp)",
        })
        continue
      }

      const normalizedKey = normalizedKeyFromFilename(file.name)
      if (!normalizedKey) {
        results.push({
          filename: file.name,
          normalizedKey: "",
          ok: false,
          error: "파일명에서 키를 만들 수 없습니다.",
        })
        continue
      }

      const storagePath = `image-pool/${normalizedKey}.${ext}`
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      // 일부 브라우저/기기에서 file.type이 비어있거나 image/*가 아닌 값으로 들어오는 경우가 있어
      // 확장자를 신뢰하고 content-type을 보정합니다.
      const contentType = file.type?.startsWith("image/")
        ? file.type
        : contentTypeForImageExt(ext)

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        results.push({
          filename: file.name,
          normalizedKey,
          ok: false,
          error: uploadError.message,
        })
        continue
      }

      const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath)
      if (!urlData?.publicUrl) {
        results.push({
          filename: file.name,
          normalizedKey,
          ok: false,
          error: "공개 URL을 가져올 수 없습니다.",
        })
        continue
      }

      // 일부 운영 DB에서 Prisma upsert 바인딩 오류(22P03)가 발생해 SQL upsert로 안전 처리
      const rowId = `img_${Date.now()}_${Math.random().toString(16).slice(2)}`
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "WordImage"
            ("id", "normalizedKey", "publicUrl", "storagePath", "originalFilename", "createdAt", "updatedAt")
          VALUES
            (${rowId}, ${normalizedKey}, ${urlData.publicUrl}, ${storagePath}, ${file.name}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("normalizedKey")
          DO UPDATE SET
            "publicUrl" = EXCLUDED."publicUrl",
            "storagePath" = EXCLUDED."storagePath",
            "originalFilename" = EXCLUDED."originalFilename",
            "updatedAt" = CURRENT_TIMESTAMP
        `
      )

      results.push({
        filename: file.name,
        normalizedKey,
        ok: true,
        publicUrl: urlData.publicUrl,
      })
    }

    const okCount = results.filter((r) => r.ok).length
    return NextResponse.json({
      message: `처리 완료: 성공 ${okCount} / 전체 ${results.length}`,
      results,
    })
  } catch (e: any) {
    console.error("word-image POST:", e)
    const msg = e.message || "업로드에 실패했습니다."
    return NextResponse.json(
      { error: wordImageTableMissingMessage(msg) },
      { status: 500 }
    )
  }
}
