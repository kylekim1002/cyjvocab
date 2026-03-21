import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from "@/lib/supabase"
import { normalizedKeyFromFilename, wordAudioTableMissingMessage } from "@/lib/word-audio"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await prisma.wordAudio.findMany({
      orderBy: { normalizedKey: "asc" },
    })
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error("word-audio GET:", e)
    const msg = e.message || "목록을 불러오지 못했습니다."
    return NextResponse.json(
      { error: wordAudioTableMissingMessage(msg) },
      { status: 500 }
    )
  }
}

/** multipart: files[] — 파일명이 단어 키 (예: apple.mp3). 동일 키는 덮어씁니다. */
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
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files.length) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024
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

      if (file.size > maxSize) {
        results.push({
          filename: file.name,
          normalizedKey: "",
          ok: false,
          error: "10MB 초과",
        })
        continue
      }

      if (!file.type.startsWith("audio/") && !file.name.toLowerCase().endsWith(".mp3")) {
        results.push({
          filename: file.name,
          normalizedKey: "",
          ok: false,
          error: "오디오 파일만 가능합니다.",
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

      const storagePath = `pool/${normalizedKey}.mp3`
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type || "audio/mpeg",
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

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)
      if (!urlData?.publicUrl) {
        results.push({
          filename: file.name,
          normalizedKey,
          ok: false,
          error: "공개 URL을 가져올 수 없습니다.",
        })
        continue
      }

      await prisma.wordAudio.upsert({
        where: { normalizedKey },
        create: {
          normalizedKey,
          publicUrl: urlData.publicUrl,
          storagePath,
          originalFilename: file.name,
        },
        update: {
          publicUrl: urlData.publicUrl,
          storagePath,
          originalFilename: file.name,
        },
      })

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
    console.error("word-audio POST:", e)
    const msg = e.message || "업로드에 실패했습니다."
    return NextResponse.json(
      { error: wordAudioTableMissingMessage(msg) },
      { status: 500 }
    )
  }
}
