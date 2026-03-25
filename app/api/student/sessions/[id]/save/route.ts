import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    const payloadJsonSchema = z
      .object({
        phase: z.string().optional(),
        currentIndex: z.coerce.number().int().optional(),
        quizAnswers: z.record(z.coerce.number()).optional(),
      })
      .passthrough()

    const schema = z.object({
      payloadJson: payloadJsonSchema.optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 저장 데이터입니다." }, { status: 400 })
    }

    const payloadJson = parsed.data.payloadJson

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
      // finalTestItems는 절대 덮어쓰지 않음 (서버가 생성한 데이터 보존)
      ...(currentPayload.finalTestItems ? { finalTestItems: currentPayload.finalTestItems } : {}),
      // phase도 보존 (클라이언트가 보낸 phase가 있으면 사용, 없으면 기존 것 유지)
      phase: payloadJson?.phase || currentPayload.phase || "test",
    }

    await prisma.studySession.update({
      where: { id: params.id },
      data: {
        payloadJson: nextPayload,
        updatedAt: new Date(),
      },
    })

    // 단어목록/암기학습만 진행률 갱신. 테스트 등에서는 문항 전체 로드 없이 스킵(응답 속도).
    const phase = (nextPayload.phase as string) || "test"
    if (phase === "wordlist" || phase === "memorization") {
      const itemCount = await prisma.learningItem.count({
        where: { moduleId: studySession.moduleId },
      })
      const currentIndex = nextPayload.currentIndex || 0
      const total = itemCount
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
