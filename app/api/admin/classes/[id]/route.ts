import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 종강 처리 (soft delete)
    await prisma.class.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
      },
    })

    // 관련 데이터 삭제
    await prisma.studentClass.deleteMany({
      where: { classId: params.id },
    })

    await prisma.classAssignment.deleteMany({
      where: { classId: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete class error:", error)
    return NextResponse.json(
      { error: "클래스 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
