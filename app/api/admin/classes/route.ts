import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const campusId = searchParams.get("campus_id")
  const levelId = searchParams.get("level_id")
  const gradeId = searchParams.get("grade_id")
  const teacherId = searchParams.get("teacher_id")

  const where: any = { deletedAt: null }
  if (campusId) {
    where.campusId = campusId
  }
  if (levelId) {
    where.levelId = levelId
  }
  if (gradeId) {
    where.gradeId = gradeId
  }
  if (teacherId) {
    where.teacherId = teacherId
  }

  const classes = await prisma.class.findMany({
    where,
    include: {
      campus: true,
      level: true,
      grade: true,
      teacher: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(classes)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, campusId, levelId, gradeId, teacherId } = await request.json()

    if (!name || !campusId || !levelId || !gradeId || !teacherId) {
      return NextResponse.json(
        { error: "모든 필드는 필수입니다." },
        { status: 400 }
      )
    }

    const cls = await prisma.class.create({
      data: {
        name: name.trim(),
        campusId,
        levelId,
        gradeId,
        teacherId,
      },
      include: {
        campus: true,
        level: true,
        grade: true,
        teacher: true,
      },
    })

    return NextResponse.json(cls)
  } catch (error) {
    console.error("Create class error:", error)
    return NextResponse.json(
      { error: "클래스 생성에 실패했습니다." },
      { status: 500 }
    )
  }
}
