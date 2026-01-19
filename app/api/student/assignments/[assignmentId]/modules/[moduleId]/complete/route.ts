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
    const { quizAnswers: requestQuizAnswers, currentIndex: requestCurrentIndex, isReview, phase: requestPhase } = body

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
    const payload = studySession.payloadJson as any
    // 클라이언트가 명시한 phase가 있으면 최우선 (payloadJson이 덮어써져도 안전)
    const phase = requestPhase || payload.phase || "test"
    
    if (module.type === "TYPE_A" || module.type === "TYPE_B") {
      // 요청에서 온 quizAnswers를 우선 사용, 없으면 세션의 quizAnswers 사용
      const quizAnswers = requestQuizAnswers || payload.quizAnswers || {}
      let correctCount = 0
      let totalItems = 0

      // 최종테스트인 경우 finalTestItems 사용
      if (phase === "finaltest" && payload.finalTestItems) {
        totalItems = payload.finalTestItems.length
        
        // quizAnswers를 정규화 (키를 숫자로 변환)
        const normalizedAnswers: Record<number, number> = {}
        Object.keys(quizAnswers).forEach(key => {
          const numKey = Number(key)
          if (!isNaN(numKey)) {
            normalizedAnswers[numKey] = Number(quizAnswers[key as keyof typeof quizAnswers])
          }
        })
        
        payload.finalTestItems.forEach((item: any, idx: number) => {
          if (!item.payloadJson) {
            console.log(`Final test item ${idx}: no payloadJson`)
            return
          }
          const correctIndex = Number(item.payloadJson.correct_index)
          const studentAnswer = normalizedAnswers[idx]
          
          console.log(`Final test item ${idx}: correctIndex=${correctIndex}, studentAnswer=${studentAnswer}, match=${studentAnswer === correctIndex}`)
          
          if (studentAnswer !== undefined && studentAnswer !== null && Number(studentAnswer) === correctIndex) {
            correctCount++
          }
        })
      } else {
        // 일반 테스트인 경우 module.items 사용
        totalItems = module.items.length
        
        // quizAnswers를 정규화 (키를 숫자로 변환)
        const normalizedAnswers: Record<number, number> = {}
        Object.keys(quizAnswers).forEach(key => {
          const numKey = Number(key)
          if (!isNaN(numKey)) {
            normalizedAnswers[numKey] = Number(quizAnswers[key as keyof typeof quizAnswers])
          }
        })
        
        module.items.forEach((item, idx) => {
          if (!item.payloadJson) return
          const itemPayload = item.payloadJson as any
          const correctIndex = Number(itemPayload.correct_index)
          const studentAnswer = normalizedAnswers[idx]
          if (studentAnswer !== undefined && studentAnswer !== null && Number(studentAnswer) === correctIndex) {
            correctCount++
          }
        })
      }

      // 점수 계산: 테스트와 최종테스트 모두 정답률(%)로 계산
      // 예: 10문항 중 9문항 정답 → 90점, 10문항 중 5문항 정답 → 50점
      score = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0

      console.log("Score calculated:", { 
        correctCount, 
        total: totalItems, 
        score, 
        phase,
        quizAnswersKeys: Object.keys(quizAnswers),
        quizAnswers: quizAnswers
      })
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
        // score_log에 기록 (복습 여부 및 최종테스트 여부 구분)
        const activityType = phase === "finaltest" 
          ? (isReview ? "FINAL_TEST_REVIEW" : "FINAL_TEST")
          : (isReview ? "REVIEW" : "LEARNING")
        
        await prisma.scoreLog.create({
          data: {
            studentId: session.user.studentId,
            campusId: assignment.class.campusId,
            classId: assignment.classId,
            activityType,
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
