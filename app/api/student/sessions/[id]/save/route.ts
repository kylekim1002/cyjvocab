import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 세션 확인
    const studySession = await prisma.studySession.findUnique({
      where: { id: params.id },
    })

    if (!studySession || studySession.studentId !== session.user.studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(studySession)
  } catch (error) {
    console.error("Get session error:", error)
    return NextResponse.json(
      { error: "세션 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { payloadJson } = await request.json()

    // 세션 확인
    const studySession = await prisma.studySession.findUnique({
      where: { id: params.id },
    })

    if (!studySession || studySession.studentId !== session.user.studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 세션 업데이트
    // NOTE: 최종테스트(finaltest)처럼 서버가 생성해 둔 payloadJson(phase/finalTestItems 등)을
    // 클라이언트가 덮어써서 잃어버리지 않도록 "병합(merge)" 한다.
    const currentPayload = (studySession.payloadJson as any) || {}
    const nextPayload = {
      ...currentPayload,
      ...(payloadJson || {}),
    }

    await prisma.studySession.update({
      where: { id: params.id },
      data: {
        payloadJson: nextPayload,
        updatedAt: new Date(),
      },
    })

    // 진행도 계산 및 업데이트 (단어목록/암기학습만, 테스트/최종테스트는 제외)
    const module = await prisma.learningModule.findUnique({
      where: { id: studySession.moduleId },
      include: {
        items: true,
      },
    })

    if (module) {
      const phase = nextPayload.phase || "test"
      // 단어목록/암기학습만 진행도 계산
      if (phase === "wordlist" || phase === "memorization") {
        const currentIndex = nextPayload.currentIndex || 0
        // 최종테스트인 경우 finalTestItems.length 사용, 아니면 module.items.length 사용
        let total = module.items.length
        if (phase === "finaltest" && nextPayload.finalTestItems) {
          total = nextPayload.finalTestItems.length
        }
        const progressPct = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0

        await prisma.studentAssignmentProgress.update({
          where: {
            studentId_assignmentId_moduleId: {
              studentId: session.user.studentId,
              assignmentId: studySession.assignmentId,
              moduleId: studySession.moduleId,
            },
          },
          data: {
            progressPct: Math.min(progressPct, 100),
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save session error:", error)
    return NextResponse.json(
      { error: "저장에 실패했습니다." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 세션 확인
    const studySession = await prisma.studySession.findUnique({
      where: { id: params.id },
    })

    if (!studySession || studySession.studentId !== session.user.studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 세션 삭제
    await prisma.studySession.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete session error:", error)
    return NextResponse.json(
      { error: "세션 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
