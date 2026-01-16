import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { assignmentId, moduleId, mode, currentIndex, totalCount } = await request.json()

    if (!assignmentId || !moduleId || !mode || currentIndex === undefined || !totalCount) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      )
    }

    if (mode !== "WORDLIST" && mode !== "MEMORIZE") {
      return NextResponse.json(
        { error: "잘못된 모드입니다." },
        { status: 400 }
      )
    }

    const studentId = session.user.studentId

    // 학생 정보 및 현재 배정 클래스 확인
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        studentClasses: {
          where: {
            endAt: null,
          },
        },
      },
    })

    if (!student || student.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "활성 상태가 아닙니다." },
        { status: 403 }
      )
    }

    // Assignment 확인
    const assignment = await prisma.classAssignment.findUnique({
      where: { id: assignmentId },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "배정을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 진행률 계산
    const maxIndex = Math.min(currentIndex, totalCount - 1)
    const progressPct = Math.floor(((maxIndex + 1) / totalCount) * 100)

    // 기존 진행률 조회 또는 생성
    const existingProgress = await prisma.studentAssignmentProgress.findUnique({
      where: {
        studentId_assignmentId_moduleId: {
          studentId,
          assignmentId,
          moduleId,
        },
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

      updatedProgress = await prisma.studentAssignmentProgress.create({
        data,
      })
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
