import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { setSemesterActive } from "@/lib/semester-status"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const isActive = Boolean(body?.isActive)

    const semesterCode = await prisma.code.findUnique({
      where: { id: params.id },
      select: { id: true, category: true },
    })
    if (!semesterCode || semesterCode.category !== "SEMESTER") {
      return NextResponse.json({ error: "학기 코드가 아닙니다." }, { status: 400 })
    }

    await setSemesterActive(params.id, isActive)
    return NextResponse.json({ success: true, id: params.id, isActive })
  } catch (error: any) {
    console.error("Update semester status error:", error)
    return NextResponse.json(
      { error: error?.message || "학기 상태 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}
