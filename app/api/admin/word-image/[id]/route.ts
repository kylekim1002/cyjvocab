import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { wordImageTableMissingMessage } from "@/lib/word-image"
import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from "@/lib/supabase"

const IMAGE_BUCKET =
  process.env.SUPABASE_IMAGE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET ||
  "word-images"

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const row = await prisma.wordImage.findUnique({
      where: { id: params.id },
    })

    if (!row) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 })
    }

    if (isSupabaseConfigured() && supabase && row.storagePath) {
      const { error: removeError } = await supabase.storage.from(IMAGE_BUCKET).remove([row.storagePath])

      if (removeError) {
        // 이전 버전에선 공용 버킷(STORAGE_BUCKET)을 사용했을 수 있어 fallback 시도
        const { error: fallbackRemoveError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([row.storagePath])
        if (fallbackRemoveError) {
          console.warn("Storage remove warning:", fallbackRemoveError.message)
        }
      }
    }

    await prisma.wordImage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("word-image DELETE:", e)
    const msg = e.message || "삭제에 실패했습니다."
    return NextResponse.json(
      { error: wordImageTableMissingMessage(msg) },
      { status: 500 }
    )
  }
}
