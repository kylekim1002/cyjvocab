import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { prisma } from "@/lib/prisma"
import { LearningPageLoading } from "@/components/student/learning-page-loading"

const LearningContent = dynamic(
  () =>
    import("@/components/student/learning-content").then((mod) => ({
      default: mod.LearningContent,
    })),
  {
    loading: () => <LearningPageLoading />,
  }
)

const SESSION_PHASE_SCAN_LIMIT = 30

const sessionSelect = {
  id: true,
  status: true,
  payloadJson: true,
  updatedAt: true,
} as const

function findSessionForPhase<
  T extends { payloadJson: unknown; status: string }
>(sessions: T[], phase: string): T | null {
  return (
    sessions.find((session) => {
      try {
        if (!session.payloadJson) {
          return phase === "test"
        }
        const payload = session.payloadJson as { phase?: string }
        const sessionPhase = payload?.phase || "test"
        return sessionPhase === phase
      } catch {
        return phase === "test"
      }
    }) ?? null
  )
}

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
    const studentId = session.user.studentId

    const sessionWhere = {
      studentId,
      assignmentId: params.assignmentId,
      moduleId: params.moduleId,
    }

    // 진행/완료 세션을 분리·상한 조회 — 100건 혼합 스캔 대신 최근 N건만 (payload만 전달)
    const [progress, inProgressCandidates, completedCandidates] =
      await Promise.all([
        prisma.studentAssignmentProgress.findUnique({
          where: {
            studentId_assignmentId_moduleId: {
              studentId,
              assignmentId: params.assignmentId,
              moduleId: params.moduleId,
            },
          },
        }),
        prisma.studySession.findMany({
          where: { ...sessionWhere, status: "IN_PROGRESS" },
          orderBy: { updatedAt: "desc" },
          take: SESSION_PHASE_SCAN_LIMIT,
          select: sessionSelect,
        }),
        prisma.studySession.findMany({
          where: { ...sessionWhere, status: "COMPLETED" },
          orderBy: { updatedAt: "desc" },
          take: SESSION_PHASE_SCAN_LIMIT,
          select: sessionSelect,
        }),
      ])

    const inProgressSession = findSessionForPhase(inProgressCandidates, phase)
    const completedSession = findSessionForPhase(completedCandidates, phase)

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
