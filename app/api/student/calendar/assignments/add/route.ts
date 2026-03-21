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
    const { date, moduleId } = body as {
      date?: string
      semesterId?: string
      levelId?: string
      moduleId?: string
    }

    if (!date || !moduleId) {
      return NextResponse.json(
        { error: "날짜와 학습(모듈) ID가 필요합니다." },
        { status: 400 }
      )
    }

    // 날짜를 'YYYY-MM-DD' 기준으로 00:00으로 정규화
    const assignedDate = new Date(date)
    assignedDate.setHours(0, 0, 0, 0)

    // 학생의 활성 클래스 중 하나를 앵커로 사용 (학습 모듈 레벨과 클래스 레벨은 무관)
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

    const anchorClass = student.studentClasses[0]?.class
    if (!anchorClass) {
      return NextResponse.json(
        { error: "배정된 클래스가 없어 학습을 추가할 수 없습니다." },
        { status: 404 }
      )
    }

    // 모듈: 등록된 활성 학습이면 배정 가능 (학기/레벨은 UI 검색용이며 본문과 불일치해도 허용)
    const module = await prisma.learningModule.findUnique({
      where: { id: moduleId },
      select: { id: true, title: true, status: true },
    })

    if (!module || module.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "선택한 학습을 찾을 수 없거나 비활성 상태입니다." },
        { status: 400 }
      )
    }

    // ClassAssignment 생성/조회 (classId + assignedDate 유니크)
    const existingAssignment = await prisma.classAssignment.findUnique({
      where: {
        classId_assignedDate: {
          classId: anchorClass.id,
          assignedDate,
        },
      },
      include: { modules: true },
    })

    const assignment = existingAssignment
      ? existingAssignment
      : await prisma.classAssignment.create({
          data: {
            classId: anchorClass.id,
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

