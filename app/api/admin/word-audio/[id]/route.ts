import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { wordAudioTableMissingMessage } from "@/lib/word-audio"
import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from "@/lib/supabase"

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const row = await prisma.wordAudio.findUnique({
      where: { id: params.id },
    })

    if (!row) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 })
    }

    if (isSupabaseConfigured() && supabase && row.storagePath) {
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([row.storagePath])

      if (removeError) {
        console.warn("Storage remove warning:", removeError.message)
      }
    }

    await prisma.wordAudio.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("word-audio DELETE:", e)
    const msg = e.message || "삭제에 실패했습니다."
    return NextResponse.json(
      { error: wordAudioTableMissingMessage(msg) },
      { status: 500 }
    )
  }
}
