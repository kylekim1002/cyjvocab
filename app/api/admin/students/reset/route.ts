import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 학생(User.role === STUDENT) 전체 삭제
    // Student 및 학습/성적 데이터는 Prisma의 onDelete: Cascade 관계로 함께 제거됩니다.
    const result = await prisma.user.deleteMany({
      where: { role: "STUDENT" },
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    })
  } catch (error) {
    console.error("Reset students error:", error)
    return NextResponse.json(
      { error: "학생 전체 초기화에 실패했습니다." },
      { status: 500 }
    )
  }
}

