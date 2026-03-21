import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

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
    const { status } = body as { status?: "ACTIVE" | "INACTIVE" }

    if (!params.id) {
      return NextResponse.json({ error: "학습 ID가 필요합니다." }, { status: 400 })
    }

    if (status !== "ACTIVE" && status !== "INACTIVE") {
      return NextResponse.json(
        { error: "status는 'ACTIVE' 또는 'INACTIVE'여야 합니다." },
        { status: 400 }
      )
    }

    const updated = await prisma.learningModule.update({
      where: { id: params.id },
      data: { status },
      select: { id: true, title: true, status: true },
    })

    return NextResponse.json({ success: true, module: updated })
  } catch (error: any) {
    console.error("Update learning module status error:", error)
    return NextResponse.json(
      { error: error?.message || "상태 변경에 실패했습니다." },
      { status: 500 }
    )
  }
}

