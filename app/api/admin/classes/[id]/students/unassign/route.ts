import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// POST: 학생 배치 해제
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const classId = params.id
    const { student_ids } = await request.json()

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { error: "학생 ID 배열이 필요합니다." },
        { status: 400 }
      )
    }

    // 배치 해제 (endAt을 현재 시간으로 설정)
    await prisma.studentClass.updateMany({
      where: {
        classId,
        studentId: { in: student_ids },
        endAt: null, // 현재 배정된 것만
      },
      data: {
        endAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unassign students error:", error)
    return NextResponse.json(
      { error: "학생 배치 해제에 실패했습니다." },
      { status: 500 }
    )
  }
}
