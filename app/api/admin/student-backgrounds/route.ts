import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import {
  STUDENT_BG_BUCKET,
  STUDENT_BG_MAX_BYTES,
  ensureStudentBackgroundBucket,
  isStudentBgMimeAllowed,
  isStudentAppBackgroundTableMissingError,
  studentAppBackgroundMissingTableResponse,
} from "@/lib/student-app-background"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return unauthorized()
  }

  try {
    const rows = await prisma.studentAppBackground.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(rows)
  } catch (e: unknown) {
    if (isStudentAppBackgroundTableMissingError(e)) {
      return studentAppBackgroundMissingTableResponse()
    }
    console.error("student-backgrounds GET:", e)
    const msg = e instanceof Error ? e.message : "목록을 불러오지 못했습니다."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** multipart: file(WebP), label(optional) */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return unauthorized()
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
    await ensureStudentBackgroundBucket()
    const formData = await request.formData()
    const file = formData.get("file")
    const labelRaw = formData.get("label")
    const label =
      typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim().slice(0, 200) : null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "파일(file)이 필요합니다." }, { status: 400 })
    }

    if (file.size > STUDENT_BG_MAX_BYTES) {
      return NextResponse.json(
        { error: `파일 용량은 ${STUDENT_BG_MAX_BYTES / (1024 * 1024)}MB 이하여야 합니다.` },
        { status: 400 }
      )
    }

    const mime = (file.type || "").toLowerCase()
    if (!isStudentBgMimeAllowed(mime)) {
      return NextResponse.json({ error: "WebP(image/webp)만 업로드할 수 있습니다." }, { status: 400 })
    }

    const id = randomUUID()
    const storagePath = `backgrounds/${id}.webp`
    const buf = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(STUDENT_BG_BUCKET)
      .upload(storagePath, buf, {
        contentType: "image/webp",
        upsert: false,
      })

    if (uploadError) {
      console.error("student-bg upload:", uploadError)
      return NextResponse.json({ error: `업로드 실패: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(STUDENT_BG_BUCKET).getPublicUrl(storagePath)
    const publicUrl = urlData.publicUrl

    const row = await prisma.studentAppBackground.create({
      data: {
        label,
        storagePath,
        publicUrl,
        isActive: false,
      },
    })

    return NextResponse.json(row)
  } catch (e: unknown) {
    if (isStudentAppBackgroundTableMissingError(e)) {
      return studentAppBackgroundMissingTableResponse()
    }
    console.error("student-backgrounds POST:", e)
    const msg = e instanceof Error ? e.message : "업로드에 실패했습니다."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
