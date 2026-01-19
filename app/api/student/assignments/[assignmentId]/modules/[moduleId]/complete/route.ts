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
      // 중요: phase와 finalTestItems는 절대 덮어쓰지 않음 (최종테스트 데이터 보존)
      if (requestQuizAnswers !== undefined || requestCurrentIndex !== undefined || requestPhase !== undefined) {
        const currentPayload = (studySession.payloadJson as any) || {}
        studySession = await prisma.studySession.update({
          where: { id: studySession.id },
          data: {
            payloadJson: {
              ...currentPayload, // 기존 데이터 모두 보존 (phase, finalTestItems 포함)
              currentIndex: requestCurrentIndex !== undefined ? requestCurrentIndex : currentPayload.currentIndex,
              quizAnswers: requestQuizAnswers !== undefined ? requestQuizAnswers : currentPayload.quizAnswers,
              phase: requestPhase !== undefined ? requestPhase : currentPayload.phase, // phase도 보존
              // finalTestItems는 절대 덮어쓰지 않음 (currentPayload에 이미 있으면 유지)
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
      if (phase === "finaltest") {
        // finalTestItems가 없으면 에러
        if (!payload.finalTestItems || !Array.isArray(payload.finalTestItems)) {
          console.error("Final test: finalTestItems not found or invalid", {
            hasFinalTestItems: !!payload.finalTestItems,
            finalTestItemsType: typeof payload.finalTestItems,
            payloadKeys: Object.keys(payload),
          })
          return NextResponse.json(
            { error: "최종테스트 데이터를 찾을 수 없습니다." },
            { status: 400 }
          )
        }
        
        totalItems = payload.finalTestItems.length
        
        // quizAnswers를 정규화: 최종테스트는 item.id를 키로 사용
        // 클라이언트에서 item.id를 키로 보내므로, 그대로 사용
        const normalizedAnswers: Record<string | number, number> = {}
        Object.keys(quizAnswers).forEach(key => {
          // 키가 숫자 문자열이면 숫자로, 아니면 문자열로 유지 (item.id는 문자열일 수 있음)
          const answerValue = Number(quizAnswers[key as keyof typeof quizAnswers])
          if (!isNaN(answerValue)) {
            normalizedAnswers[key] = answerValue
          }
        })
        
        console.log("Final test scoring:", {
          totalItems,
          quizAnswersCount: Object.keys(quizAnswers).length,
          normalizedAnswersCount: Object.keys(normalizedAnswers).length,
          normalizedAnswers,
          finalTestItemIds: payload.finalTestItems.map((item: any, idx: number) => item.id || idx),
        })
        
        // 최종테스트 점수 계산: 각 문항의 정답과 학생 답안 비교
        // 아이템 ID로 매칭하여 순서와 무관하게 정확한 매칭 보장
        for (let idx = 0; idx < payload.finalTestItems.length; idx++) {
          const item = payload.finalTestItems[idx]
          if (!item || !item.payloadJson) {
            console.warn(`Final test item ${idx}: missing item or payloadJson`)
            continue
          }
          
          // item.id가 없으면 인덱스를 fallback으로 사용
          const itemId = item.id || idx
          
          const correctIndex = Number(item.payloadJson.correct_index)
          // 아이템 ID로 답안 찾기 (순서와 무관), 없으면 인덱스로 시도
          const studentAnswer = normalizedAnswers[itemId] ?? normalizedAnswers[idx]
          
          // 정답 인덱스 유효성 검증
          if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
            console.error(`Final test item ${idx}: invalid correctIndex`, {
              correctIndex,
              payloadJson: item.payloadJson,
            })
            continue
          }
          
          // 학생 답안과 정답 비교
          const isCorrect = studentAnswer !== undefined && 
                           studentAnswer !== null && 
                           !isNaN(Number(studentAnswer)) &&
                           Number(studentAnswer) === correctIndex
          
          console.log(`Final test item ${idx + 1}/${totalItems} (ID: ${itemId}):`, {
            word: item.payloadJson.word_text,
            correctIndex,
            studentAnswer,
            isCorrect,
            itemId: itemId,
            originalItemId: item.id,
            answerKey: itemId,
            choices: [
              item.payloadJson.choice1,
              item.payloadJson.choice2,
              item.payloadJson.choice3,
              item.payloadJson.choice4,
            ],
          })
          
          if (isCorrect) {
            correctCount++
          }
        }
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
      // 공식: (맞은 문항 수 / 총 문항 수) × 100
      // 예: 10문항 중 9문항 정답 → 90점
      // 예: 10문항 중 5문항 정답 → 50점
      // 예: 20문항 중 17문항 정답 → 85점
      
      // 점수 계산 전 검증
      if (totalItems <= 0) {
        console.error("점수 계산 오류: totalItems가 0 이하", { 
          phase, 
          correctCount, 
          totalItems,
          hasFinalTestItems: phase === "finaltest" ? !!payload.finalTestItems : "N/A",
          finalTestItemsLength: phase === "finaltest" ? (payload.finalTestItems?.length || 0) : "N/A",
        })
        score = 0
      } else if (correctCount < 0) {
        console.error("점수 계산 오류: correctCount가 음수", { correctCount, totalItems })
        score = 0
      } else {
        // 정확한 백분율 계산: (맞은 문항 수 / 총 문항 수) × 100
        const percentage = (correctCount / totalItems) * 100
        score = Math.round(percentage)
        
        // 점수 검증: 0~100 범위 확인
        if (score < 0) {
          console.error("점수 계산 오류: 점수가 음수", { score, correctCount, totalItems, percentage })
          score = 0
        } else if (score > 100) {
          console.error("점수 계산 오류: 점수가 100 초과", { score, correctCount, totalItems, percentage })
          score = 100
        }
        
        // 점수 계산 검증 로그 (상세)
        console.log("=== 최종 점수 계산 결과 ===", {
          phase,
          correctCount,
          totalItems,
          percentage: percentage.toFixed(2),
          score,
          formula: `(${correctCount} / ${totalItems}) × 100 = ${percentage.toFixed(2)}% → ${score}점`,
          quizAnswersCount: Object.keys(quizAnswers).length,
        })
      }
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
