import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    const schema = z.object({
      assignmentId: z.string().min(1),
      moduleId: z.string().min(1),
      mode: z.enum(["WORDLIST", "MEMORIZE"]),
      currentIndex: z.coerce.number().int().nonnegative(),
      totalCount: z.coerce.number().int().positive(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었거나 잘못되었습니다." },
        { status: 400 }
      )
    }

    const { assignmentId, moduleId, mode, currentIndex, totalCount } = parsed.data

    const studentId = session.user.studentId

    // 진행률 계산
    const maxIndex = Math.min(currentIndex, totalCount - 1)
    const progressPct = Math.floor(((maxIndex + 1) / totalCount) * 100)

    // 기존 진행률 조회 또는 생성
    // 핫패스(대부분 existing=true)에서는 1회 조회 + 1회 업데이트만 수행.
    const existingProgress = await prisma.studentAssignmentProgress.findUnique({
      where: {
        studentId_assignmentId_moduleId: {
          studentId,
          assignmentId,
          moduleId,
        },
      },
      select: {
        id: true,
        wordlistMaxIndex: true,
        memorizeMaxIndex: true,
      },
    })

    let updatedProgress

    if (existingProgress) {
      // 최대값만 업데이트 (퇴행 금지)
      const currentMaxIndex = mode === "WORDLIST" 
        ? (existingProgress.wordlistMaxIndex || 0)
        : (existingProgress.memorizeMaxIndex || 0)
      
      const newMaxIndex = Math.max(currentMaxIndex, maxIndex)
      const newProgressPct = Math.floor(((newMaxIndex + 1) / totalCount) * 100)

      if (mode === "WORDLIST") {
        updatedProgress = await prisma.studentAssignmentProgress.update({
          where: {
            studentId_assignmentId_moduleId: {
              studentId,
              assignmentId,
              moduleId,
            },
          },
          data: {
            wordlistMaxIndex: newMaxIndex,
            wordlistProgressPct: newProgressPct,
          },
        })
      } else {
        updatedProgress = await prisma.studentAssignmentProgress.update({
          where: {
            studentId_assignmentId_moduleId: {
              studentId,
              assignmentId,
              moduleId,
            },
          },
          data: {
            memorizeMaxIndex: newMaxIndex,
            memorizeProgressPct: newProgressPct,
          },
        })
      }
    } else {
      // 새로 생성
      const data: any = {
        studentId,
        assignmentId,
        moduleId,
        progressPct: 0,
        completed: false,
      }

      if (mode === "WORDLIST") {
        data.wordlistMaxIndex = maxIndex
        data.wordlistProgressPct = progressPct
      } else {
        data.memorizeMaxIndex = maxIndex
        data.memorizeProgressPct = progressPct
      }

      try {
        updatedProgress = await prisma.studentAssignmentProgress.create({
          data,
        })
      } catch (error: any) {
        // 생성 시 FK 제약에 걸리는 경우(예: assignment 삭제)만 404로 매핑
        if (error?.code === "P2003") {
          return NextResponse.json(
            { error: "배정을 찾을 수 없습니다." },
            { status: 404 }
          )
        }
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      maxIndex: mode === "WORDLIST" 
        ? updatedProgress.wordlistMaxIndex 
        : updatedProgress.memorizeMaxIndex,
      progressPct: mode === "WORDLIST"
        ? updatedProgress.wordlistProgressPct
        : updatedProgress.memorizeProgressPct,
    })
  } catch (error: any) {
    console.error("Progress update error:", error)
    return NextResponse.json(
      { error: error.message || "진행률 업데이트에 실패했습니다." },
      { status: 500 }
    )
  }
}
