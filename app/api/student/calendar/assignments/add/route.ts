import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { date, semesterId, levelId, moduleId } = body as {
      date?: string
      semesterId?: string
      levelId?: string
      moduleId?: string
    }

    if (!date || !semesterId || !levelId || !moduleId) {
      return NextResponse.json(
        { error: "날짜/학기/레벨/학습(모듈) 값이 필요합니다." },
        { status: 400 }
      )
    }

    // 날짜를 'YYYY-MM-DD' 기준으로 00:00으로 정규화
    const assignedDate = new Date(date)
    assignedDate.setHours(0, 0, 0, 0)

    // 학생의 활성 클래스 중 levelId 일치하는 클래스 1개 선택
    const student = await prisma.student.findUnique({
      where: { id: session.user.studentId },
      include: {
        studentClasses: {
          where: {
            endAt: null,
            class: { deletedAt: null },
          },
          include: { class: true },
        },
      },
    })

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "활성 학생이 아닙니다." },
        { status: 403 }
      )
    }

    const matchedClass = student.studentClasses
      .map((sc) => sc.class)
      .find((cls) => cls.levelId === levelId)

    if (!matchedClass) {
      return NextResponse.json(
        { error: "선택한 레벨에 해당하는 배정 클래스가 없습니다." },
        { status: 404 }
      )
    }

    // 모듈 검증: semesterId/levelId가 일치해야 함
    const module = await prisma.learningModule.findUnique({
      where: { id: moduleId },
      select: { id: true, title: true, levelId: true, semesterId: true },
    })

    if (
      !module ||
      module.levelId !== levelId ||
      // semesterId는 optional이지만, 학생 추가 UI에서는 semester를 필수로 취급
      module.semesterId !== semesterId
    ) {
      return NextResponse.json(
        { error: "선택한 학습(모듈)이 조건에 맞지 않습니다." },
        { status: 400 }
      )
    }

    // ClassAssignment 생성/조회 (classId + assignedDate 유니크)
    const existingAssignment = await prisma.classAssignment.findUnique({
      where: {
        classId_assignedDate: {
          classId: matchedClass.id,
          assignedDate,
        },
      },
      include: { modules: true },
    })

    const assignment = existingAssignment
      ? existingAssignment
      : await prisma.classAssignment.create({
          data: {
            classId: matchedClass.id,
            assignedDate,
          },
          include: { modules: true },
        })

    // 이미 해당 모듈이 배정되어 있으면 no-op
    const existingCam = await prisma.classAssignmentModule.findUnique({
      where: {
        assignmentId_moduleId: {
          assignmentId: assignment.id,
          moduleId,
        },
      },
    })

    if (existingCam) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const maxOrderAgg = await prisma.classAssignmentModule.aggregate({
      where: { assignmentId: assignment.id },
      _max: { order: true },
    })

    await prisma.classAssignmentModule.create({
      data: {
        assignmentId: assignment.id,
        moduleId,
        order: (maxOrderAgg._max.order ?? 0) + 1,
        source: "STUDENT",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Student add assignment error:", error)
    return NextResponse.json(
      { error: error?.message || "학생 학습 추가에 실패했습니다." },
      { status: 500 }
    )
  }
}

