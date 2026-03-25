import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

/**
 * 학생 등록/수정 폼용 캠퍼스·학년·레벨 목록.
 * (코드값 관리 API는 SUPER_ADMIN 전용이라 MANAGER는 여기서만 조회)
 */
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [campuses, gradeCodes, levelCodes] = await Promise.all([
      prisma.campus.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.code.findMany({
        where: { category: "GRADE" },
        orderBy: { order: "asc" },
        select: { id: true, value: true, category: true, order: true },
      }),
      prisma.code.findMany({
        where: { category: "LEVEL" },
        orderBy: { order: "asc" },
        select: { id: true, value: true, category: true, order: true },
      }),
    ])

    return NextResponse.json({ campuses, gradeCodes, levelCodes })
  } catch (error) {
    console.error("student-form-meta error:", error)
    return NextResponse.json(
      { error: "폼용 데이터를 불러오지 못했습니다." },
      { status: 500 }
    )
  }
}
