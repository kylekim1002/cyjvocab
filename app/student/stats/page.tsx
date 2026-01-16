import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { StudentStats } from "@/components/student/student-stats"

export default async function StatsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return null
  }

  // 최근 30일 완료된 학습 세션 조회
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const completedSessions = await prisma.studySession.findMany({
    where: {
      studentId: session.user.studentId,
      status: "COMPLETED",
      completedAt: {
        gte: thirtyDaysAgo,
      },
      score: {
        not: null,
      },
    },
    include: {
      assignment: {
        include: {
          class: true,
        },
      },
      module: {
        include: {
          items: true,
        },
      },
    },
    orderBy: {
      completedAt: "desc",
    },
  })

  // 각 학습(assignment + module)별로 최고 점수 세션만 선택
  const bestSessionsMap = new Map<string, typeof completedSessions[0]>()

  completedSessions.forEach((session) => {
    const key = `${session.assignmentId}_${session.moduleId}`
    const existing = bestSessionsMap.get(key)
    
    if (!existing || (session.score || 0) > (existing.score || 0)) {
      bestSessionsMap.set(key, session)
    }
  })

  // 각 학습별 최고 점수 세션의 상세 정보 계산
  const sessionData = Array.from(bestSessionsMap.values()).map((session) => {
    const payload = session.payloadJson as any
    const quizAnswers = payload?.quizAnswers || {}
    const totalItems = session.module.items.length
    let correctCount = 0

    // 정답 개수 계산
    session.module.items.forEach((item, idx) => {
      const payload = item.payloadJson as any
      const correctIndex = payload.correct_index
      if (quizAnswers[idx] === correctIndex) {
        correctCount++
      }
    })

    return {
      id: session.id,
      assignedDate: session.assignment.assignedDate, // 제출일
      completedAt: session.completedAt || session.updatedAt, // 응시일
      totalItems, // 문항수
      correctCount, // 정답수
      score: session.score || 0, // 점수
      moduleTitle: session.module.title,
    }
  })

  // 날짜순으로 정렬
  sessionData.sort((a, b) => {
    const dateA = new Date(a.completedAt).getTime()
    const dateB = new Date(b.completedAt).getTime()
    return dateB - dateA
  })

  // 통계 계산 (최고 점수만 포함)
  const totalScore = sessionData.reduce((sum, item) => sum + item.score, 0)
  const totalCount = sessionData.length
  const averageScore = totalCount > 0 ? Math.round(totalScore / totalCount) : 0

  return (
    <StudentStats
      sessionData={sessionData}
      totalScore={totalScore}
      totalCount={totalCount}
      averageScore={averageScore}
    />
  )
}
