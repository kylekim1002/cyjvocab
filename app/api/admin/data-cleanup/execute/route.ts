import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // SUPER_ADMIN만 접근 가능
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { campus_id, date_from, date_to, confirm_text } = await request.json()

    // 캠퍼스 필수
    if (!campus_id) {
      return NextResponse.json(
        { error: "캠퍼스를 선택해주세요." },
        { status: 400 }
      )
    }

    // 날짜 필수
    if (!date_from || !date_to) {
      return NextResponse.json(
        { error: "조회 기간을 선택해주세요." },
        { status: 400 }
      )
    }

    // DELETE 확인 텍스트 필수
    if (confirm_text !== "DELETE") {
      return NextResponse.json(
        { error: "확인 텍스트가 일치하지 않습니다." },
        { status: 400 }
      )
    }

    // 날짜를 명시적으로 설정 (시작일 00:00:00, 종료일 23:59:59.999)
    const fromDate = new Date(date_from)
    fromDate.setHours(0, 0, 0, 0) // 시작일 00:00:00
    const toDate = new Date(date_to)
    toDate.setHours(23, 59, 59, 999) // 종료일 23:59:59.999

    // 31일 제한 검증
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 31) {
      return NextResponse.json(
        { error: "조회 기간은 최대 31일까지 가능합니다." },
        { status: 400 }
      )
    }

    // 캠퍼스 확인
    const campus = await prisma.campus.findUnique({
      where: { id: campus_id },
    })

    if (!campus) {
      return NextResponse.json(
        { error: "캠퍼스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 트랜잭션으로 삭제 처리
    await prisma.$transaction(async (tx) => {
      // 1. StudentAssignmentProgress 삭제 (해당 캠퍼스의 클래스에 속한 assignment의 progress)
      const assignments = await tx.classAssignment.findMany({
        where: {
          class: {
            campusId: campus_id,
          },
          assignedDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: { id: true },
      })

      const assignmentIds = assignments.map((a) => a.id)

      if (assignmentIds.length > 0) {
        await tx.studentAssignmentProgress.deleteMany({
          where: {
            assignmentId: {
              in: assignmentIds,
            },
          },
        })
      }

      // 2. StudySession 삭제
      if (assignmentIds.length > 0) {
        await tx.studySession.deleteMany({
          where: {
            assignmentId: {
              in: assignmentIds,
            },
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
        })
      }

      // 3. ScoreLog 삭제
      await tx.scoreLog.deleteMany({
        where: {
          campusId: campus_id,
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
      })

      // 4. ScoreDaily 삭제
      await tx.scoreDaily.deleteMany({
        where: {
          campusId: campus_id,
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      })

      // 5. StudentLearningAttempt 삭제
      await tx.studentLearningAttempt.deleteMany({
        where: {
          campusId: campus_id,
          assignmentDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
      })

      // 6. ClassAssignmentModule 삭제 (해당 기간의 assignment의 모듈 연결 삭제)
      if (assignmentIds.length > 0) {
        await tx.classAssignmentModule.deleteMany({
          where: {
            assignmentId: {
              in: assignmentIds,
            },
          },
        })
      }

      // 7. ClassAssignment 삭제 (해당 기간의 assignment 삭제)
      if (assignmentIds.length > 0) {
        await tx.classAssignment.deleteMany({
          where: {
            id: {
              in: assignmentIds,
            },
          },
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: "데이터 정리가 완료되었습니다.",
    })
  } catch (error: any) {
    console.error("Data cleanup execute error:", error)
    return NextResponse.json(
      { error: "데이터 정리에 실패했습니다." },
      { status: 500 }
    )
  }
}
