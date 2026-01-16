import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

// DELETE: 날짜 전체 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; assignmentId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { assignmentId } = params

    // 배정 삭제 (CASCADE로 모듈도 함께 삭제됨)
    await prisma.classAssignment.delete({
      where: { id: assignmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete assignment error:", error)
    return NextResponse.json(
      { error: "배정 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
