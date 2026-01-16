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
    // 요청 본문에서 phase 확인
    const body = await request.json().catch(() => ({}))
    const phase = body.phase || "test"

    const studentId = session.user.studentId

    // 학생 정보 및 현재 배정 클래스 확인
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        studentClasses: {
          where: {
            endAt: null, // 현재 배정된 클래스만
          },
        },
      },
    })

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "활성 상태가 아니거나 클래스에 배정되지 않았습니다. 캠퍼스로 문의하세요." },
        { status: 403 }
      )
    }

    if (student.studentClasses.length === 0) {
      return NextResponse.json(
        { error: "현재 배정된 클래스가 없습니다. 캠퍼스로 문의하세요." },
        { status: 403 }
      )
    }

    // Assignment 확인 및 권한 검증
    const assignment = await prisma.classAssignment.findUnique({
      where: { id: params.assignmentId },
      include: {
        class: true,
        modules: {
          where: {
            moduleId: params.moduleId,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "배정을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 학생이 이 클래스에 배정되어 있는지 확인
    const isAssigned = student.studentClasses.some(
      (sc) => sc.classId === assignment.classId
    )

    if (!isAssigned) {
      return NextResponse.json(
        { error: "이 클래스에 배정되지 않았습니다. 캠퍼스로 문의하세요." },
        { status: 403 }
      )
    }

    // 모듈이 이 배정에 포함되어 있는지 확인
    if (assignment.modules.length === 0) {
      return NextResponse.json(
        { error: "이 배정에 해당 학습이 포함되어 있지 않습니다." },
        { status: 404 }
      )
    }

    // 모듈 정보 조회
    const module = await prisma.learningModule.findUnique({
      where: { id: params.moduleId },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    })

    if (!module) {
      return NextResponse.json(
        { error: "학습 모듈을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    let payloadJson: any = {
      currentIndex: 0,
      phase,
    }

    // 최종테스트인 경우: 랜덤 단어 선택 및 보기 순서 섞기
    if (phase === "finaltest") {
      // 전체 단어 중 20개 선택 (20개 미만이면 모두)
      const totalItems = module.items.length
      const selectCount = Math.min(20, totalItems)
      
      // 랜덤으로 단어 선택
      const shuffled = [...module.items].sort(() => Math.random() - 0.5)
      const selectedItems = shuffled.slice(0, selectCount)
      
      // 선택된 단어의 순서를 다시 랜덤으로 섞기
      const randomizedItems = selectedItems.sort(() => Math.random() - 0.5)
      
      // 각 단어의 보기 순서를 랜덤으로 섞고 정답 인덱스 업데이트
      const processedItems = randomizedItems.map((item) => {
        const payload = item.payloadJson as any
        const choices = [
          payload.choice1,
          payload.choice2,
          payload.choice3,
          payload.choice4,
        ].filter(Boolean)
        
        const originalCorrectIndex = payload.correct_index || 0
        const correctAnswer = choices[originalCorrectIndex]
        
        // 보기 순서 랜덤 섞기
        const shuffledChoices = [...choices].sort(() => Math.random() - 0.5)
        
        // 정답의 새로운 인덱스 찾기
        const newCorrectIndex = shuffledChoices.findIndex((c) => c === correctAnswer)
        
        // 새로운 payload 생성
        const newPayload = {
          ...payload,
          choice1: shuffledChoices[0] || "",
          choice2: shuffledChoices[1] || "",
          choice3: shuffledChoices[2] || "",
          choice4: shuffledChoices[3] || "",
          correct_index: newCorrectIndex,
        }
        
        return {
          id: item.id,
          order: item.order,
          payloadJson: newPayload,
        }
      })
      
      payloadJson = {
        ...payloadJson,
        finalTestItems: processedItems,
        originalItemIds: processedItems.map((item) => item.id),
      }
    }

    // 새 세션 생성
    const studySession = await prisma.studySession.create({
      data: {
        studentId,
        assignmentId: params.assignmentId,
        moduleId: params.moduleId,
        status: "IN_PROGRESS",
        payloadJson,
      },
    })

    // 진행도 생성 또는 업데이트
    await prisma.studentAssignmentProgress.upsert({
      where: {
        studentId_assignmentId_moduleId: {
          studentId,
          assignmentId: params.assignmentId,
          moduleId: params.moduleId,
        },
      },
      create: {
        studentId,
        assignmentId: params.assignmentId,
        moduleId: params.moduleId,
        progressPct: 0,
      },
      update: {},
    })

    return NextResponse.json({ sessionId: studySession.id })
  } catch (error) {
    console.error("Start session error:", error)
    return NextResponse.json(
      { error: "학습 시작에 실패했습니다." },
      { status: 500 }
    )
  }
}
