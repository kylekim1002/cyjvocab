import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

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
    await prisma.studySession.update({
      where: { id: params.id },
      data: {
        payloadJson,
        updatedAt: new Date(),
      },
    })

    // 진행도 계산 및 업데이트
    const module = await prisma.learningModule.findUnique({
      where: { id: studySession.moduleId },
      include: {
        items: true,
      },
    })

    if (module) {
      const currentIndex = payloadJson.currentIndex || 0
      const total = module.items.length
      const progressPct = Math.round(((currentIndex + 1) / total) * 100)

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
