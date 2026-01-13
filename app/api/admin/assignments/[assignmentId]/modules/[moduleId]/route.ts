import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// DELETE: 특정 날짜에서 특정 학습 제거
export async function DELETE(
  request: Request,
  { params }: { params: { assignmentId: string; moduleId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { assignmentId, moduleId } = params

    // 배정 모듈 삭제
    await prisma.classAssignmentModule.deleteMany({
      where: {
        assignmentId,
        moduleId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete assignment module error:", error)
    return NextResponse.json(
      { error: "학습 제거에 실패했습니다." },
      { status: 500 }
    )
  }
}
