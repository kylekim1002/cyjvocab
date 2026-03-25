import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { LearningContent } from "@/components/student/learning-content"

/** 학습 본문은 정적 import — dynamic 청크 분리 시 추가 네트워크 왕복으로 체감 지연될 수 있어 통합 */
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

    const studentId = session.user.studentId
    // 캘린더/다른 진입 경로에서 phase 파라미터가 영문키(wordlist/...) 또는 한글 라벨(쓰기학습)로 들어올 수 있어 정규화
    const rawPhase = searchParams?.phase || "test"
    const phase = (() => {
      const p = String(rawPhase).trim().toLowerCase()
      if (p === "wordlist" || p === "단어목록") return "wordlist"
      if (p === "wordlearning" || p === "단어학습") return "wordlearning"
      if (p === "memorization" || p === "플래시카드" || p === "암기학습") return "memorization"
      if (p === "writing" || p === "쓰기학습") return "writing"
      if (p === "test" || p === "테스트") return "test"
      return "test"
    })()
    const isReviewMode = searchParams?.review === "true"

    const sessionWhere = {
      studentId,
      assignmentId: params.assignmentId,
      moduleId: params.moduleId,
    }

    // 학생·배정·모듈·진행·세션 후보를 한 번에 병렬 조회 → DB 왕복 1회로 체감 지연 감소
    const [
      student,
      assignment,
      module,
      progress,
      inProgressCandidates,
      completedCandidates,
    ] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
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
