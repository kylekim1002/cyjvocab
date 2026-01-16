import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

// GET: 클래스 배정 목록 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const classId = params.id
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") // YYYY-MM 형식

    const where: any = { classId }

    if (month) {
      const [year, monthNum] = month.split("-")
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59)
      
      where.assignedDate = {
        gte: startDate,
        lte: endDate,
      }
    }

    const assignments = await prisma.classAssignment.findMany({
      where,
      include: {
        modules: {
          include: {
            module: {
              include: {
                level: true,
                grade: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { assignedDate: "desc" },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Get assignments error:", error)
    return NextResponse.json(
      { error: "배정 목록 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}

// POST: 학습 배정
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
    const { date, module_ids } = await request.json()

    if (!date || !Array.isArray(module_ids) || module_ids.length === 0) {
      return NextResponse.json(
        { error: "날짜와 학습 ID 배열이 필요합니다." },
        { status: 400 }
      )
    }

    // 중복 확인
    const uniqueModuleIds = [...new Set(module_ids)]
    if (uniqueModuleIds.length !== module_ids.length) {
      return NextResponse.json(
        { error: "중복된 학습이 있습니다." },
        { status: 400 }
      )
    }

    const assignedDate = new Date(date)
    assignedDate.setHours(0, 0, 0, 0)

    // 클래스 존재 확인
    const cls = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!cls) {
      return NextResponse.json(
        { error: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 학습 모듈 확인
    const modules = await prisma.learningModule.findMany({
      where: { id: { in: module_ids } },
      include: { level: true },
    })

    if (modules.length !== module_ids.length) {
      return NextResponse.json(
        { error: "일부 학습을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 트랜잭션으로 배정 처리
    const result = await prisma.$transaction(async (tx) => {
      // 기존 배정 확인 (있으면 사용, 없으면 생성)
      let assignment = await tx.classAssignment.findUnique({
        where: {
          classId_assignedDate: {
            classId,
            assignedDate,
          },
        },
        include: {
          modules: true,
        },
      })

      if (!assignment) {
        assignment = await tx.classAssignment.create({
          data: {
            classId,
            assignedDate,
          },
          include: {
            modules: true,
          },
        })
      }

      // 기존 모듈 ID 목록
      const existingModuleIds = assignment.modules.map((m) => m.moduleId)

      // 새로 추가할 모듈들
      const newModuleIds = module_ids.filter((id) => !existingModuleIds.includes(id))

      // 새 모듈 추가
      if (newModuleIds.length > 0) {
        const maxOrder = assignment.modules.length > 0
          ? Math.max(...assignment.modules.map((m) => m.order))
          : 0

        await tx.classAssignmentModule.createMany({
          data: newModuleIds.map((moduleId, index) => ({
            assignmentId: assignment!.id,
            moduleId,
            order: maxOrder + index + 1,
          })),
        })
      }

      // 최종 배정 정보 반환
      return await tx.classAssignment.findUnique({
        where: { id: assignment.id },
        include: {
          modules: {
            include: {
              module: {
                include: {
                  level: true,
                  grade: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      })
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Create assignment error:", error)
    return NextResponse.json(
      { error: error.message || "학습 배정에 실패했습니다." },
      { status: 500 }
    )
  }
}
