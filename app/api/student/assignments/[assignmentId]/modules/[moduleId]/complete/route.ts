import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: { assignmentId: string; moduleId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 요청 본문에서 quizAnswers, currentIndex, isReview 가져오기
    const body = await request.json().catch(() => ({}))
    const { quizAnswers: requestQuizAnswers, currentIndex: requestCurrentIndex, isReview } = body

    console.log("Complete API called", {
      studentId: session.user.studentId,
      assignmentId: params.assignmentId,
      moduleId: params.moduleId,
      hasQuizAnswers: !!requestQuizAnswers,
    })

    // 진행 중인 세션 찾기 (IN_PROGRESS 또는 최근 세션)
    let studySession = await prisma.studySession.findFirst({
      where: {
        studentId: session.user.studentId,
        assignmentId: params.assignmentId,
        moduleId: params.moduleId,
        status: "IN_PROGRESS",
      },
      orderBy: { updatedAt: "desc" },
    })

    // IN_PROGRESS 세션이 없으면 최근 세션 찾기
    if (!studySession) {
      studySession = await prisma.studySession.findFirst({
        where: {
          studentId: session.user.studentId,
          assignmentId: params.assignmentId,
          moduleId: params.moduleId,
        },
        orderBy: { updatedAt: "desc" },
      })
    }

    // 세션이 없으면 새로 생성 (학습을 완료한 경우)
    if (!studySession) {
      console.log("No session found, creating new session for completion")
      studySession = await prisma.studySession.create({
        data: {
          studentId: session.user.studentId,
          assignmentId: params.assignmentId,
          moduleId: params.moduleId,
          status: "IN_PROGRESS",
          payloadJson: {
            currentIndex: requestCurrentIndex || 0,
            quizAnswers: requestQuizAnswers || {},
          },
        },
      })
      console.log("Created new session for completion:", studySession.id)
    } else {
      console.log("Found session:", studySession.id, studySession.status)
      // 기존 세션의 payloadJson 업데이트 (요청에서 온 데이터로)
      if (requestQuizAnswers !== undefined || requestCurrentIndex !== undefined) {
        const currentPayload = (studySession.payloadJson as any) || {}
        studySession = await prisma.studySession.update({
          where: { id: studySession.id },
          data: {
            payloadJson: {
              ...currentPayload,
              currentIndex: requestCurrentIndex !== undefined ? requestCurrentIndex : currentPayload.currentIndex,
              quizAnswers: requestQuizAnswers !== undefined ? requestQuizAnswers : currentPayload.quizAnswers,
            },
          },
        })
      }
    }

    // 모듈 정보 조회
    const module = await prisma.learningModule.findUnique({
      where: { id: params.moduleId },
      include: {
        items: true,
      },
    })

    if (!module) {
      return NextResponse.json(
        { error: "학습 모듈을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 점수 계산 (TYPE_A, TYPE_B인 경우)
    let score = null
    if (module.type === "TYPE_A" || module.type === "TYPE_B") {
      const payload = studySession.payloadJson as any
      // 요청에서 온 quizAnswers를 우선 사용, 없으면 세션의 quizAnswers 사용
      const quizAnswers = requestQuizAnswers || payload.quizAnswers || {}
      let correctCount = 0

      module.items.forEach((item, idx) => {
        if (!item.payloadJson) return
        const payload = item.payloadJson as any
        const correctIndex = payload.correct_index
        if (quizAnswers[idx] === correctIndex) {
          correctCount++
        }
      })

      score = Math.round((correctCount / module.items.length) * 100)
      console.log("Score calculated:", { correctCount, total: module.items.length, score })
    }

    // 세션 완료 처리
    await prisma.studySession.update({
      where: { id: studySession.id },
      data: {
        status: "COMPLETED",
        score,
        completedAt: new Date(),
      },
    })

    // 진행도 완료 처리 (복습 모드가 아닐 때만)
    if (!isReview) {
      await prisma.studentAssignmentProgress.upsert({
        where: {
          studentId_assignmentId_moduleId: {
            studentId: session.user.studentId,
            assignmentId: params.assignmentId,
            moduleId: params.moduleId,
          },
        },
        create: {
          studentId: session.user.studentId,
          assignmentId: params.assignmentId,
          moduleId: params.moduleId,
          progressPct: 100,
          completed: true,
          completedAt: new Date(),
        },
        update: {
          progressPct: 100,
          completed: true,
          completedAt: new Date(),
        },
      })
    }

    // 점수 로그 기록 (TYPE_A, TYPE_B인 경우)
    if ((module.type === "TYPE_A" || module.type === "TYPE_B") && score !== null) {
      const assignment = await prisma.classAssignment.findUnique({
        where: { id: params.assignmentId },
        include: {
          class: {
            include: {
              campus: true,
            },
          },
        },
      })

      if (assignment) {
        // score_log에 기록 (복습 여부 구분)
        await prisma.scoreLog.create({
          data: {
            studentId: session.user.studentId,
            campusId: assignment.class.campusId,
            classId: assignment.classId,
            activityType: isReview ? "REVIEW" : "LEARNING",
            score,
          },
        })

        // score_daily 업데이트
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        await prisma.scoreDaily.upsert({
          where: {
            date_campusId_classId_studentId: {
              date: today,
              campusId: assignment.class.campusId,
              classId: assignment.classId,
              studentId: session.user.studentId,
            },
          },
          create: {
            date: today,
            studentId: session.user.studentId,
            campusId: assignment.class.campusId,
            classId: assignment.classId,
            totalScore: score,
            totalCount: 1,
          },
          update: {
            totalScore: {
              increment: score,
            },
            totalCount: {
              increment: 1,
            },
          },
        })
      }
    }

    return NextResponse.json({ success: true, score })
  } catch (error) {
    console.error("Complete session error:", error)
    return NextResponse.json(
      { error: "완료 처리에 실패했습니다." },
      { status: 500 }
    )
  }
}
