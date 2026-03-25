import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
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

    // 반에서 학생을 빼면 해당 반의 학습 기록을 모두 삭제
    await prisma.$transaction(async (tx) => {
      // 해당 classId에 속한 assignment(=캘린더 배정 단위) 목록
      const assignments = await tx.classAssignment.findMany({
        where: { classId },
        select: { id: true },
      })
      const assignmentIds = assignments.map((a) => a.id)

      if (assignmentIds.length > 0) {
        // 진행률/세션 삭제
        await Promise.all([
          tx.studentAssignmentProgress.deleteMany({
            where: {
              studentId: { in: student_ids },
              assignmentId: { in: assignmentIds },
            },
          }),
          tx.studySession.deleteMany({
            where: {
              studentId: { in: student_ids },
              assignmentId: { in: assignmentIds },
            },
          }),
        ])
      }

      // 점수/시도 삭제(ScoreLog/ScoreDaily/StudentLearningAttempt는 classId를 직접 가진다)
      await Promise.all([
        tx.scoreLog.deleteMany({
          where: {
            studentId: { in: student_ids },
            classId,
          },
        }),
        tx.scoreDaily.deleteMany({
          where: {
            studentId: { in: student_ids },
            classId,
          },
        }),
        tx.studentLearningAttempt.deleteMany({
          where: {
            studentId: { in: student_ids },
            classId,
          },
        }),
      ])

      // 배치 해제 (endAt을 현재 시간으로 설정)
      await tx.studentClass.updateMany({
        where: {
          classId,
          studentId: { in: student_ids },
          endAt: null, // 현재 배정된 것만
        },
        data: {
          endAt: new Date(),
        },
      })
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
