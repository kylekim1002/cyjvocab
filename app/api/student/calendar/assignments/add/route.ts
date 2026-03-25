import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    const schema = z.object({
      date: z.string().min(1),
      moduleId: z.string().min(1),
      semesterId: z.string().optional(),
      levelId: z.string().optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "날짜와 학습(모듈) ID가 필요합니다." },
        { status: 400 }
      )
    }

    const { date, moduleId } = parsed.data

    // 날짜를 'YYYY-MM-DD' 기준으로 00:00으로 정규화
    const assignedDate = new Date(date)
    if (Number.isNaN(assignedDate.getTime())) {
      return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 })
    }
    assignedDate.setHours(0, 0, 0, 0)

    // 학생의 활성 클래스 중 하나를 앵커로 사용 (학습 모듈 레벨과 클래스 레벨은 무관)
    const student = await prisma.student.findUnique({
      where: { id: session.user.studentId },
      select: {
        status: true,
        studentClasses: {
          where: {
            endAt: null,
            class: { deletedAt: null },
          },
          select: { classId: true },
        },
      },
    })

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "활성 학생이 아닙니다." },
        { status: 403 }
      )
    }

    const anchorClassId = student.studentClasses[0]?.classId
    if (!anchorClassId) {
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
          classId: anchorClassId,
          assignedDate,
        },
      },
    })

    let assignment = existingAssignment
    if (!assignment) {
      try {
        assignment = await prisma.classAssignment.create({
          data: {
            classId: anchorClassId,
            assignedDate,
          },
        })
      } catch (err: any) {
        // 동시 요청으로 인해 유니크 제약이 먼저 생성된 케이스 처리
        if (err?.code === "P2002") {
          assignment = await prisma.classAssignment.findUnique({
            where: {
              classId_assignedDate: {
                classId: anchorClassId,
                assignedDate,
              },
            },
          })
        }
        if (!assignment) throw err
      }
    }

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

    try {
      await prisma.classAssignmentModule.create({
        data: {
          assignmentId: assignment.id,
          moduleId,
          order: (maxOrderAgg._max.order ?? 0) + 1,
          source: "STUDENT",
        },
      })
    } catch (err: any) {
      // 동시 요청으로 인해 같은 (assignmentId, moduleId)가 이미 생성된 경우 no-op 처리
      if (err?.code === "P2002") {
        return NextResponse.json({ success: true, skipped: true })
      }
      throw err
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Student add assignment error:", error)
    return NextResponse.json(
      { error: error?.message || "학생 학습 추가에 실패했습니다." },
      { status: 500 }
    )
  }
}

