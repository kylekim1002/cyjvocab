import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { STUDENT_BG_BUCKET } from "@/lib/student-app-background"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/** 본문: { "isActive": boolean }. true면 전역에서 이 행만 활성, 나머지는 모두 false */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return unauthorized()
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 })
  }

  const isActive = (body as { isActive?: unknown }).isActive
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive(boolean)가 필요합니다." }, { status: 400 })
  }

  try {
    const exists = await prisma.studentAppBackground.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!exists) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 })
    }

    if (isActive) {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.studentAppBackground.updateMany({ data: { isActive: false } })
        return tx.studentAppBackground.update({
          where: { id: params.id },
          data: { isActive: true },
        })
      })
      return NextResponse.json(updated)
    }

    const updated = await prisma.studentAppBackground.update({
      where: { id: params.id },
      data: { isActive: false },
    })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    console.error("student-backgrounds PATCH:", e)
    const msg = e instanceof Error ? e.message : "저장에 실패했습니다."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return unauthorized()
  }

  try {
    const row = await prisma.studentAppBackground.findUnique({
      where: { id: params.id },
    })

    if (!row) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 })
    }

    if (isSupabaseConfigured() && supabase && row.storagePath) {
      const { error: removeError } = await supabase.storage
        .from(STUDENT_BG_BUCKET)
        .remove([row.storagePath])
      if (removeError) {
        console.warn("student-bg storage remove:", removeError.message)
      }
    }

    await prisma.studentAppBackground.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error("student-backgrounds DELETE:", e)
    const msg = e instanceof Error ? e.message : "삭제에 실패했습니다."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
