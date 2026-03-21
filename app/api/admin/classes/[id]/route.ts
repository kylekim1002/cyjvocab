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
    const { name, campusId, levelId, gradeId, teacherId } = body as {
      name?: string
      campusId?: string
      levelId?: string
      gradeId?: string
      teacherId?: string
    }

    if (
      !name?.trim() ||
      !campusId ||
      !levelId ||
      !gradeId ||
      !teacherId
    ) {
      return NextResponse.json(
        { error: "반명, 캠퍼스, 레벨, 학년, 선생님은 모두 필수입니다." },
        { status: 400 }
      )
    }

    const existing = await prisma.class.findFirst({
      where: { id: params.id, deletedAt: null },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const updated = await prisma.class.update({
      where: { id: params.id },
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

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Update class error:", error)
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "존재하지 않는 캠퍼스, 레벨, 학년 또는 선생님입니다." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        error: "클래스 수정에 실패했습니다.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

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
