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
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.studentId) {
      redirect("/student")
    }

    // 학생/배정/모듈을 병렬 조회해 페이지 전환 지연 최소화
    const [student, assignment, module] = await Promise.all([
      prisma.student.findUnique({
        where: { id: session.user.studentId },
        select: {
          status: true,
          studentClasses: {
            where: {
              endAt: null, // 현재 배정된 클래스만
            },
            select: { classId: true },
          },
        },
      }),
      prisma.classAssignment.findUnique({
        where: { id: params.assignmentId },
        select: {
          id: true,
          classId: true,
          modules: {
            where: {
              moduleId: params.moduleId,
            },
            select: { id: true },
          },
        },
      }),
      prisma.learningModule.findUnique({
        where: { id: params.moduleId },
        select: {
          id: true,
          title: true,
          type: true,
          items: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              payloadJson: true,
            },
          },
        },
      }),
    ])

    if (!student || student.status !== "ACTIVE") {
      redirect("/student")
    }

    if (student.studentClasses.length === 0) {
      redirect("/student")
    }

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

    if (!module) {
      redirect("/student")
    }

    // 복습 모드 확인
    const isReviewMode = searchParams?.review === "true"
    // 단계 확인 (wordlist, memorization, test, finaltest)
    const phase = searchParams?.phase || "test" // 기본값은 test

    const [progress, allSessions] = await Promise.all([
      prisma.studentAssignmentProgress.findUnique({
        where: {
          studentId_assignmentId_moduleId: {
            studentId: session.user.studentId,
            assignmentId: params.assignmentId,
            moduleId: params.moduleId,
          },
        },
      }),
      prisma.studySession.findMany({
        where: {
          studentId: session.user.studentId,
          assignmentId: params.assignmentId,
          moduleId: params.moduleId,
          status: { in: ["IN_PROGRESS", "COMPLETED"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    ])

    const allInProgressSessions = allSessions.filter(
      (session) => session.status === "IN_PROGRESS"
    )

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

    // 완료된 세션 확인 (해당 phase의 세션만)
    const allCompletedSessions = allSessions.filter(
      (session) => session.status === "COMPLETED"
    )

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
  } catch (error) {
    console.error("LearningPage server error:", error)
    // 서버 오류가 발생해도 전체 Application error 대신 학생 홈으로 이동
    redirect("/student")
  }
}
