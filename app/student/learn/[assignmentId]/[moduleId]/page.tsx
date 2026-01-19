import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { LearningContent } from "@/components/student/learning-content"

export default async function LearningPage({
  params,
  searchParams,
}: {
  params: { assignmentId: string; moduleId: string }
  searchParams: { review?: string; phase?: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    redirect("/student")
  }

  // 학생 정보 및 현재 배정 클래스 확인
  const student = await prisma.student.findUnique({
    where: { id: session.user.studentId },
    include: {
      studentClasses: {
        where: {
          endAt: null, // 현재 배정된 클래스만
        },
      },
    },
  })

  if (!student || student.status !== "ACTIVE") {
    redirect("/student")
  }

  if (student.studentClasses.length === 0) {
    redirect("/student")
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
    redirect("/student")
  }

  // 학생이 이 클래스에 배정되어 있는지 확인
  const isAssigned = student.studentClasses.some(
    (sc) => sc.classId === assignment.classId
  )

  if (!isAssigned) {
    redirect("/student")
  }

  // 모듈이 이 배정에 포함되어 있는지 확인
  if (assignment.modules.length === 0) {
    redirect("/student")
  }

  // 학습 모듈 조회
  const module = await prisma.learningModule.findUnique({
    where: { id: params.moduleId },
    include: {
      items: {
        orderBy: { order: "asc" },
      },
    },
  })

  if (!module) {
    redirect("/student")
  }

  // 복습 모드 확인
  const isReviewMode = searchParams?.review === "true"
  // 단계 확인 (wordlist, memorization, test, finaltest)
  const phase = searchParams?.phase || "test" // 기본값은 test

  // 진행 중인 세션 확인 (모든 진행 중인 세션 조회 후 phase로 필터링)
  const allInProgressSessions = await prisma.studySession.findMany({
    where: {
      studentId: session.user.studentId,
      assignmentId: params.assignmentId,
      moduleId: params.moduleId,
      status: "IN_PROGRESS",
    },
    orderBy: { updatedAt: "desc" },
  })

  // 해당 phase의 진행 중인 세션 찾기
  const inProgressSession = allInProgressSessions.find((session) => {
    try {
      if (!session.payloadJson) {
        return phase === "test" // payloadJson이 없으면 test로 간주
      }
      const payload = session.payloadJson as any
      const sessionPhase = payload?.phase || "test" // 기본값은 test
      return sessionPhase === phase
    } catch (error) {
      console.error("Error parsing session payloadJson:", error)
      // payloadJson이 없거나 파싱 실패 시 기본값으로 test로 간주
      return phase === "test"
    }
  }) || null

  // 진행도 확인
  const progress = await prisma.studentAssignmentProgress.findUnique({
    where: {
      studentId_assignmentId_moduleId: {
        studentId: session.user.studentId,
        assignmentId: params.assignmentId,
        moduleId: params.moduleId,
      },
    },
  })

  // 완료된 세션 확인 (해당 phase의 세션만)
  // 모든 완료된 세션을 조회한 후 phase로 필터링
  const allCompletedSessions = await prisma.studySession.findMany({
    where: {
      studentId: session.user.studentId,
      assignmentId: params.assignmentId,
      moduleId: params.moduleId,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
  })

  // 해당 phase의 완료된 세션 찾기
  const completedSession = allCompletedSessions.find((session) => {
    try {
      if (!session.payloadJson) {
        return phase === "test" // payloadJson이 없으면 test로 간주
      }
      const payload = session.payloadJson as any
      const sessionPhase = payload?.phase || "test" // 기본값은 test
      return sessionPhase === phase
    } catch (error) {
      console.error("Error parsing session payloadJson:", error)
      // payloadJson이 없거나 파싱 실패 시 기본값으로 test로 간주
      return phase === "test"
    }
  }) || null

  return (
    <LearningContent
      module={module}
      assignmentId={params.assignmentId}
      inProgressSession={inProgressSession}
      progress={progress}
      isReviewMode={isReviewMode}
      completedSession={completedSession}
      phase={phase}
    />
  )
}
